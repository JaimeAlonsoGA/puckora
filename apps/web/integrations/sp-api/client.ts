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

import { getLwaAccessToken, invalidateLwaToken } from './lwa'
import { acquireRateToken } from './rate-limiter'
import type {
    CatalogItem,
    CatalogItemSalesRank,
    CatalogItemSummary,
    FeeEstimateRequest,
    GetCatalogItemParams,
    GetFeesEstimateResponse,
    GetItemOffersParams,
    GetItemOffersResponse,
    SearchCatalogItemsParams,
    SearchCatalogItemsResponse,
    SpApiErrorResponse,
    SP_API_MARKETPLACE_ID as SpApiMarketplaceIdMap,
} from './types'
import { SP_API_MARKETPLACE_ID, SP_API_REGION_ENDPOINT } from './types'
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

/** Resolve marketplace code to SP-API ID. Throws on unknown codes. */
export function toSpApiMarketplaceId(marketplaceCode: string): string {
    const id = SP_API_MARKETPLACE_ID[marketplaceCode.toUpperCase()]
    if (!id) {
        throw new SpApiError(`Unknown puckora marketplace code: "${marketplaceCode}"`)
    }
    return id
}

/**
 * Like toSpApiMarketplaceId but returns null instead of throwing.
 * Use when you want to handle unknown codes with HTTP 400 rather than 500.
 */
export function trySpApiMarketplaceId(marketplaceCode: string): string | null {
    return SP_API_MARKETPLACE_ID[marketplaceCode.toUpperCase()] ?? null
}

// ---------------------------------------------------------------------------
// Keyword cleaning for SP-API catalog search
// ---------------------------------------------------------------------------

/**
 * Trim a supplier product title down to a focused SP-API search keyword.
 * Strips Chinese characters, brackets, and caps at 7 words.
 */
export function cleanSearchKeyword(title: string): string {
    const cleaned = title
        .replace(/[\u4e00-\u9fff]+/g, '') // strip Chinese
        .replace(/[[\](){}]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    return cleaned.split(' ').filter(Boolean).slice(0, 7).join(' ')
}

// ---------------------------------------------------------------------------
// CatalogItem field accessors
// ---------------------------------------------------------------------------

/** Extract item name from a SP-API CatalogItem for the given marketplace. */
export function extractCatalogTitle(item: CatalogItem, marketplaceId: string): string | null {
    return item.summaries?.find((s) => s.marketplaceId === marketplaceId)?.itemName ?? null
}

/** Extract brand from a SP-API CatalogItem for the given marketplace. */
export function extractCatalogBrand(item: CatalogItem, marketplaceId: string): string | null {
    return (
        item.summaries?.find((s: CatalogItemSummary) => s.marketplaceId === marketplaceId)?.brand ??
        null
    )
}

/** Extract main product image URL from a SP-API CatalogItem. */
export function extractCatalogImage(item: CatalogItem, marketplaceId: string): string | null {
    const imageSet = item.images?.find((img) => img.marketplaceId === marketplaceId)
    if (!imageSet?.images?.length) return null
    const main = imageSet.images.find((img) => img.variant === 'MAIN') ?? imageSet.images[0]
    return main?.link ?? null
}

/** Extract Best Seller Rank from a SP-API CatalogItem. Prefers classificationRanks. */
export function extractCatalogBsr(
    item: CatalogItem,
    marketplaceId: string,
): { rank: number; category: string } | null {
    const rankSet = item.salesRanks?.find(
        (r: CatalogItemSalesRank) => r.marketplaceId === marketplaceId,
    )
    if (!rankSet) return null
    const classification = rankSet.classificationRanks?.[0]
    if (classification) return { rank: classification.rank, category: classification.title }
    const displayGroup = rankSet.displayGroupRanks?.[0]
    if (displayGroup) return { rank: displayGroup.rank, category: displayGroup.title }
    return null
}
