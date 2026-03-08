/**
 * Amazon SP-API typed client — server-side only.
 *
 * Wraps the 4 SP-API endpoints required for puckora:
 *   - searchCatalogItems
 *   - getCatalogItem
 *   - getItemOffers
 *   - getMyFeesEstimateForASIN
 *
 * Token refresh and rate limiting are handled transparently.
 * On 401 responses the LWA token is invalidated and the request retried once.
 *
 * Required env vars: SP_API_CLIENT_ID, SP_API_CLIENT_SECRET
 * Optional: SP_API_REFRESH_TOKEN (required for delegated/seller-specific calls)
 */

import { getLwaAccessToken, invalidateLwaToken } from '@puckora/web/lib/sp-api/lwa'
import { acquireRateToken } from '@puckora/web/lib/sp-api/rate-limiter'
import type {
    CatalogItem,
    FeeEstimateRequest,
    GetCatalogItemParams,
    GetFeesEstimateResponse,
    GetItemOffersParams,
    GetItemOffersResponse,
    SearchCatalogItemsParams,
    SearchCatalogItemsResponse,
    SpApiErrorResponse,
    SP_API_MARKETPLACE_ID as SpApiMarketplaceIdMap,
} from '@puckora/web/lib/sp-api/types'
import { SP_API_MARKETPLACE_ID, SP_API_REGION_ENDPOINT } from '@puckora/web/lib/sp-api/types'

export class SpApiError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly errors?: SpApiErrorResponse['errors'],
    ) {
        super(message)
        this.name = 'SpApiError'
    }
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------
async function spApiFetch<T>(
    regionEndpoint: string,
    path: string,
    operation: string,
    options: RequestInit = {},
    retryOn401 = true,
): Promise<T> {
    await acquireRateToken(operation)

    const accessToken = await getLwaAccessToken()
    const url = `${regionEndpoint}${path}`

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-amz-access-token': accessToken,
            ...(options.headers ?? {}),
        },
        signal: AbortSignal.timeout(30_000),
    })

    if (response.status === 401 && retryOn401) {
        invalidateLwaToken()
        return spApiFetch<T>(regionEndpoint, path, operation, options, false)
    }

    if (!response.ok) {
        const body = await response.json().catch(() => ({ errors: [] })) as Partial<SpApiErrorResponse>
        throw new SpApiError(
            `SP-API ${operation} failed: ${response.status} ${response.statusText}`,
            response.status,
            body.errors,
        )
    }

    return response.json() as Promise<T>
}

function getRegionEndpoint(marketplaceId: string): string {
    const endpoint = SP_API_REGION_ENDPOINT[marketplaceId]
    if (!endpoint) {
        throw new SpApiError(`No SP-API region endpoint found for marketplace ID "${marketplaceId}"`)
    }
    return endpoint
}

// ---------------------------------------------------------------------------
// searchCatalogItems
// ---------------------------------------------------------------------------
export async function searchCatalogItems(
    params: SearchCatalogItemsParams,
): Promise<SearchCatalogItemsResponse> {
    const primaryMarketplaceId = params.marketplaceIds[0]
    if (!primaryMarketplaceId) throw new SpApiError('At least one marketplaceId required')
    const regionEndpoint = getRegionEndpoint(primaryMarketplaceId)

    const query = new URLSearchParams()
    params.marketplaceIds.forEach((id) => query.append('marketplaceIds', id))
    if (params.keywords) params.keywords.forEach((k) => query.append('keywords', k))
    if (params.brandNames) params.brandNames.forEach((b) => query.append('brandNames', b))
    if (params.classificationIds) params.classificationIds.forEach((c) => query.append('classificationIds', c))
    if (params.includedData) params.includedData.forEach((d) => query.append('includedData', d))
    if (params.identifiers) params.identifiers.forEach((i) => query.append('identifiers', i))
    if (params.identifiersType) query.set('identifiersType', params.identifiersType)
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    if (params.pageToken) query.set('pageToken', params.pageToken)
    if (params.keywordsLocale) query.set('keywordsLocale', params.keywordsLocale)
    if (params.locale) query.set('locale', params.locale)

    return spApiFetch<SearchCatalogItemsResponse>(
        regionEndpoint,
        `/catalog/2022-04-01/items?${query.toString()}`,
        'searchCatalogItems',
    )
}

// ---------------------------------------------------------------------------
// getCatalogItem
// ---------------------------------------------------------------------------
export async function getCatalogItem(params: GetCatalogItemParams): Promise<CatalogItem> {
    const primaryMarketplaceId = params.marketplaceIds[0]
    if (!primaryMarketplaceId) throw new SpApiError('At least one marketplaceId required')
    const regionEndpoint = getRegionEndpoint(primaryMarketplaceId)

    const query = new URLSearchParams()
    params.marketplaceIds.forEach((id) => query.append('marketplaceIds', id))
    const includedData = params.includedData ?? [
        'attributes',
        'dimensions',
        'identifiers',
        'images',
        'productTypes',
        'salesRanks',
        'summaries',
    ]
    includedData.forEach((d) => query.append('includedData', d))
    if (params.locale) query.set('locale', params.locale)

    return spApiFetch<CatalogItem>(
        regionEndpoint,
        `/catalog/2022-04-01/items/${encodeURIComponent(params.asin)}?${query.toString()}`,
        'getCatalogItem',
    )
}

// ---------------------------------------------------------------------------
// getItemOffers
// ---------------------------------------------------------------------------
export async function getItemOffers(params: GetItemOffersParams): Promise<GetItemOffersResponse> {
    const regionEndpoint = getRegionEndpoint(params.marketplaceId)

    const query = new URLSearchParams({
        MarketplaceId: params.marketplaceId,
        ItemCondition: params.itemCondition,
        ...(params.customerType ? { CustomerType: params.customerType } : {}),
    })

    const wrapper = await spApiFetch<{ payload: GetItemOffersResponse }>(
        regionEndpoint,
        `/products/pricing/v0/items/${encodeURIComponent(params.asin)}/offers?${query.toString()}`,
        'getItemOffers',
    )
    return wrapper.payload
}

// ---------------------------------------------------------------------------
// getMyFeesEstimateForASIN (single ASIN)
// ---------------------------------------------------------------------------
export async function getFeesEstimate(
    request: FeeEstimateRequest,
): Promise<GetFeesEstimateResponse> {
    const marketplaceId = request.marketplaceId
    const regionEndpoint = getRegionEndpoint(marketplaceId)

    const body = {
        FeesEstimateRequest: {
            MarketplaceId: marketplaceId,
            PriceToEstimateFees: {
                ListingPrice: request.priceToEstimateFees.listingPrice,
                Shipping: request.priceToEstimateFees.shipping,
                Points: request.priceToEstimateFees.points,
            },
            IsAmazonFulfilled: request.isAmazonFulfilled ?? true,
            Identifier: request.identifier,
            OptionalFulfillmentProgram: request.optionalFulfillmentProgram,
        },
    }

    return spApiFetch<GetFeesEstimateResponse>(
        regionEndpoint,
        `/products/fees/v0/feesEstimate/asin/${encodeURIComponent(request.asin)}`,
        'getFeesEstimate',
        { method: 'POST', body: JSON.stringify(body) },
    )
}

// ---------------------------------------------------------------------------
// Convenience: resolve puckora marketplace code → SP-API marketplace ID
// ---------------------------------------------------------------------------
export function toSpApiMarketplaceId(marketplaceCode: string): string {
    const id = SP_API_MARKETPLACE_ID[marketplaceCode.toUpperCase()]
    if (!id) {
        throw new SpApiError(`Unknown puckora marketplace code: "${marketplaceCode}"`)
    }
    return id
}
