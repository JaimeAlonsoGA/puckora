import { CONFIG } from '../config'
import { log } from '../logger'
import { spApiCall, sleep } from './client'
import type { FeeEstimateResult } from './types'

// ─── RAW FEES ESTIMATE API RESPONSE ──────────────────────────────────────────

// The batch endpoint returns a bare array of FeesEstimateResult (no payload wrapper)
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

// ─── getFeesEstimatesBatch ───────────────────────────────────────────────────

export async function getFeesEstimatesBatch(
    items: Array<{ asin: string; price: number }>,
): Promise<Map<string, FeeEstimateResult>> {
    const result = new Map<string, FeeEstimateResult>()
    const BATCH = 20
    const url = 'https://sellingpartnerapi-na.amazon.com/products/fees/v0/feesEstimate'

    for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH)

        // Body is a bare array of FeesEstimateByIdRequest objects.
        // PriceToEstimateFees/IsAmazonFulfilled/Identifier go inside FeesEstimateRequest;
        // IdType and IdValue are siblings of FeesEstimateRequest.
        const body = batch.map(({ asin, price }) => ({
            FeesEstimateRequest: {
                MarketplaceId: CONFIG.sp_marketplace_id,
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

        // Batch endpoint rate limit is 0.5 req/s → min 2s between calls
        await sleep(Math.max(CONFIG.spapi_delay_ms, 2_000))

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
                log.warn(`Fee estimate error for ${asin}: ${msg}`)
                result.set(asin, { fba_fee: null, referral_fee: null })
                continue
            }

            const fees = entry.FeesEstimate
            const toAmt = (v: number | null | undefined) =>
                v != null && isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : null

            // FBAPerUnitFulfillmentFee can appear at the top level of FeeDetailList,
            // or nested inside IncludedFeeDetailList of a parent fee (e.g. "FBAFees").
            const allFees = [
                ...(fees?.FeeDetailList ?? []),
                ...(fees?.FeeDetailList ?? []).flatMap(f => f.IncludedFeeDetailList ?? []),
            ]

            const fbaFee = toAmt(allFees.find(f => f.FeeType === 'FBAFees')?.FinalFee?.Amount)
            const refFee = toAmt(allFees.find(f => f.FeeType === 'ReferralFee')?.FinalFee?.Amount)

            if (fbaFee === null) {
                const types = allFees.map(f => f.FeeType).join(', ') || '(none)'
                log.warn(`No FBAFees for ${asin} — fee types: ${types}`)
            }

            result.set(asin, { fba_fee: fbaFee, referral_fee: refFee })
        }

        log.api(`Fee batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(items.length / BATCH)} — ${batch.length} ASINs`)
    }

    return result
}
