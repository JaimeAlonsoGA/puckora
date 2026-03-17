/**
 * SP-API Fees endpoint wrappers.
 *
 * Two exported functions serve different consumers:
 *
 *  `getFeesEstimatesBatch(items, options?)` — scraper / enrichment form.
 *    Accepts up to 20 ASINs with prices per call. Handles batching and sleep
 *    internally. Returns a Map<asin, ParsedFeeEstimate> ready for enrichAsin().
 *
 *  `getFeesEstimate(request)` — single-ASIN raw API form.
 *    Returns the full `GetFeesEstimateResponse` payload. Used by data-pipeline
 *    integrations that need the raw fee breakdown.
 */

import { spApiCall, sleep } from './client'
import { acquireRateToken } from './rate-limiter'
import {
    SP_API_MARKETPLACE_ID,
    SP_API_REGION_ENDPOINT,
    type ParsedFeeEstimate,
    type FeeEstimateRequest,
    type GetFeesEstimateResponse,
} from './types'
import { getSpApiConfig } from './config'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getRegionEndpoint(marketplaceId: string): string {
    const endpoint = SP_API_REGION_ENDPOINT[marketplaceId]
    if (!endpoint) throw new Error(`No SP-API region endpoint found for marketplace ID "${marketplaceId}"`)
    return endpoint
}

// Raw batch response — array of FeesEstimateResult objects
type RawFeesEstimatesResponse = Array<{
    Status?: string
    FeesEstimateIdentifier?: { SellerInputIdentifier?: string }
    FeesEstimate?: {
        TotalFeesEstimate?: { Amount: number }
        FeeDetailList?: Array<{
            FeeType: string
            FinalFee?: { Amount: number }
            FeeAmount?: { Amount: number }
            IncludedFeeDetailList?: Array<{
                FeeType: string
                FinalFee?: { Amount: number }
                FeeAmount?: { Amount: number }
            }>
        }>
    }
    Error?: { Type: string; Code: string; Message: string }
}>

// ---------------------------------------------------------------------------
// getFeesEstimatesBatch
// ---------------------------------------------------------------------------

/**
 * Fetch FBA + referral fee estimates for a batch of ASINs with known prices.
 *
 * The endpoint caps at 20 items per request; this function handles batching
 * automatically. Sleeps at least 2 s between batches (0.5 req/s limit).
 *
 * Marketplace resolution:
 *  1. `options.marketplaceId` (explicit SP-API ID)
 *  2. `options.marketplaceCode` (e.g. 'US') → resolved via SP_API_MARKETPLACE_ID
 *  3. `SP_MARKETPLACE_ID` env var
 *  4. ATVPDKIKX0DER (US) fallback
 */
export async function getFeesEstimatesBatch(
    items: Array<{ asin: string; price: number }>,
    options: { marketplaceId?: string; marketplaceCode?: string } = {},
): Promise<Map<string, ParsedFeeEstimate>> {
    const cfg = getSpApiConfig()

    const marketplaceId =
        options.marketplaceId ??
        (options.marketplaceCode ? SP_API_MARKETPLACE_ID[options.marketplaceCode.toUpperCase()] : undefined) ??
        cfg.marketplaceId

    const regionEndpoint = getRegionEndpoint(marketplaceId)
    const url = `${regionEndpoint}/products/fees/v0/feesEstimate`

    const result = new Map<string, ParsedFeeEstimate>()
    const BATCH = 20

    for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH)

        // Batch endpoint rate limit is 0.5 req/s → min 2s between calls
        await acquireRateToken('getFeesEstimatesBatch')
        await sleep(Math.max(cfg.retryOn429Ms > 0 ? 0 : 0, 2_000))

        const body = batch.map(({ asin, price }) => ({
            FeesEstimateRequest: {
                MarketplaceId: marketplaceId,
                IsAmazonFulfilled: true,
                PriceToEstimateFees: {
                    ListingPrice: { Amount: price, CurrencyCode: 'USD' },
                    Shipping: { Amount: 0, CurrencyCode: 'USD' },
                },
                Identifier: asin,
            },
            IdType: 'ASIN',
            IdValue: asin,
        }))

        const raw = await spApiCall<RawFeesEstimatesResponse>(url, {
            method: 'POST',
            body: JSON.stringify(body),
        })

        if (!Array.isArray(raw)) continue

        for (const entry of raw) {
            const asin = entry.FeesEstimateIdentifier?.SellerInputIdentifier
            if (!asin) continue

            if (entry.Status !== 'Success' || entry.Error) {
                const msg = entry.Error?.Message ?? entry.Status ?? 'unknown error'
                console.warn(`SP-API fee estimate error for ${asin}: ${msg}`)
                result.set(asin, { fba_fee: null, referral_fee: null })
                continue
            }

            const fees = entry.FeesEstimate
            const toAmt = (v: number | null | undefined) =>
                v != null && isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : null

            // FBAFees can appear at the top level or nested inside IncludedFeeDetailList
            const allFees = [
                ...(fees?.FeeDetailList ?? []),
                ...(fees?.FeeDetailList ?? []).flatMap((f) => f.IncludedFeeDetailList ?? []),
            ]

            const fbaFee = toAmt(allFees.find((f) => f.FeeType === 'FBAFees')?.FinalFee?.Amount)
            const refFee = toAmt(allFees.find((f) => f.FeeType === 'ReferralFee')?.FinalFee?.Amount)

            if (fbaFee === null) {
                const types = allFees.map((f) => f.FeeType).join(', ') || '(none)'
                console.warn(`SP-API: No FBAFees for ${asin} — fee types present: ${types}`)
            }

            result.set(asin, { fba_fee: fbaFee, referral_fee: refFee })
        }

        const batchNum = Math.floor(i / BATCH) + 1
        const total = Math.ceil(items.length / BATCH)
        console.debug(`SP-API fee batch ${batchNum}/${total} — ${batch.length} ASINs`)
    }

    return result
}

// ---------------------------------------------------------------------------
// getFeesEstimate — single-ASIN raw API form
// ---------------------------------------------------------------------------

/**
 * Fetch a fee estimate for a single ASIN and return the raw API payload.
 * Use this when you need the full fee breakdown, not just FBA + referral.
 */
export async function getFeesEstimate(request: FeeEstimateRequest): Promise<GetFeesEstimateResponse | null> {
    const regionEndpoint = getRegionEndpoint(request.marketplaceId)

    const body = {
        FeesEstimateRequest: {
            MarketplaceId: request.marketplaceId,
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

    await acquireRateToken('getFeesEstimate')
    return spApiCall<GetFeesEstimateResponse>(
        `${regionEndpoint}/products/fees/v0/feesEstimate/asin/${encodeURIComponent(request.asin)}`,
        { method: 'POST', body: JSON.stringify(body) },
    )
}
