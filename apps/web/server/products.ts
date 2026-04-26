/**
 * Server-side React.cache wrappers for Amazon product data.
 *
 * Deduplicate identical fetches within a single React render tree.
 * Only import these from Server Components / Server Actions.
 */
import 'server-only'

import { cache } from 'react'
import { after } from 'next/server'
import { createFlyioDb } from '@/integrations/flyio/client'
import {
    getAmazonProductByAsin,
    getProductsNeedingEnrichment,
    discoverProducts,
} from '@/services/products'
import type { DiscoverFilters } from '@/schemas/discover'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Process-level safeguards
// ---------------------------------------------------------------------------

/**
 * ASINs we've already attempted bpm-repair or SP-API enrichment on in this
 * server process. Covers both the discover list path and the single-ASIN path
 * so repeated page loads for the same product don't re-queue the same tasks.
 * Resets on server restart — the repair runs once more, finds the same result,
 * and stops again.
 */
const recentlyAttemptedBpmRepair = new Set<string>()

/**
 * ASINs we've already queued for full SP-API enrichment in this process.
 * Separate from the BPM set: a product may need enrichment but already have
 * a BPM badge, or need BPM but already be fully enriched.
 */
const recentlyAttemptedEnrichment = new Set<string>()

/**
 * One-time flag: clear any bought_past_month = 0 rows left over from a
 * buggy repair run that incorrectly wrote 0 when the badge was absent.
 * Amazon's badge never shows 0; the only valid values are null (unknown) or
 * a positive integer (demand signal). Runs once per server process via after().
 */
let bpmZeroCleanedUp = false

/**
 * Fetch a product by ASIN. Deduplicated per request.
 *
 * After returning, enqueues background repair tasks when data is incomplete:
 *  - BPM repair: fetch the Amazon product page for a bought_past_month badge.
 *  - SP-API enrichment: re-run getCatalogItemParsed + fees for products whose
 *    initial pipeline pass produced an enrichment_failed status.
 *
 * Both tasks run after the HTTP response (via after()), never blocking SSR.
 * Process-level Sets prevent re-queuing the same ASIN on every page load.
 */
export const cachedGetProductByAsin = cache(async (asin: string) => {
    const db = createFlyioDb()
    const product = await getAmazonProductByAsin(db, asin)

    if (product) {
        const needsBpmRepair =
            product.bought_past_month == null &&
            !recentlyAttemptedBpmRepair.has(asin)
        const needsEnrichment =
            (product.scrape_status === 'scraped' || product.scrape_status === 'enrichment_failed') &&
            !recentlyAttemptedEnrichment.has(asin)

        if (needsBpmRepair || needsEnrichment) {
            if (needsBpmRepair) recentlyAttemptedBpmRepair.add(asin)
            if (needsEnrichment) recentlyAttemptedEnrichment.add(asin)

            // Capture values before the async boundary so the closure is stable.
            const repairAsin = product.asin
            const repairListing = needsEnrichment
                ? {
                    asin: product.asin,
                    rank: null,
                    name: product.title ?? product.asin,
                    price: product.price ?? null,
                    rating: product.rating ?? null,
                    review_count: product.review_count ?? null,
                    product_url: product.product_url ?? `https://www.amazon.com/dp/${product.asin}`,
                    bought_past_month: product.bought_past_month ?? null,
                }
                : null

            after(async () => {
                try {
                    const tasks: Promise<unknown>[] = []
                    if (needsBpmRepair) {
                        const { repairBpmBatch } = await import('@/integrations/data-pipeline/bpm-repair')
                        tasks.push(repairBpmBatch(db, [repairAsin]))
                    }
                    if (needsEnrichment && repairListing) {
                        const { enrichAsinBatch } = await import('@/integrations/data-pipeline/enrich')
                        tasks.push(enrichAsinBatch(db, [repairListing]))
                    }
                    await Promise.allSettled(tasks)
                } catch (err) {
                    console.error(`[asin] background repair failed for ${asin}:`, err)
                }
            })
        }
    }

    return product
})

/**
 * Fetch discover results for /search/discover.
 *
 * After returning results, enqueues a background BPM repair pass for any
 * product in the result set that is missing bought_past_month. The repair
 * fetches individual Amazon product pages and writes the badge value back to
 * the DB so subsequent requests surface revenue data for those products.
 * Fire-and-forget: never delays the server-render response.
 */
export const getCachedDiscoverProducts = cache(async (filters: DiscoverFilters) => {
    const db = createFlyioDb()
    const products = await discoverProducts(db, filters)

    // One-time cleanup of any bought_past_month=0 rows written by a buggy repair run.
    // Amazon never shows a 0 badge — every 0 in the DB is corrupted data.
    if (!bpmZeroCleanedUp) {
        bpmZeroCleanedUp = true
        after(async () => {
            try {
                await db.execute(sql`
                    UPDATE amazon_products
                    SET bought_past_month = NULL
                    WHERE asin IN (
                        SELECT asin FROM amazon_products
                        WHERE bought_past_month = 0
                        LIMIT 500
                    )
                `)
                console.log('[discover] zero-bpm cleanup: cleared corrupted bought_past_month=0 rows')
            } catch (err) {
                console.error('[discover] zero-bpm cleanup failed:', err)
                bpmZeroCleanedUp = false // retry on next page load
            }
        })
    }

    const candidateAsins = products
        .filter((p) => p.bought_past_month == null && p.asin != null)
        .map((p) => p.asin as string)

    // Exclude ASINs already attempted this process lifetime to avoid spamming
    // Amazon with repeated fetches that consistently return no badge.
    const missingBpmAsins = candidateAsins.filter((a) => !recentlyAttemptedBpmRepair.has(a))

    if (missingBpmAsins.length > 0) {
        for (const asin of missingBpmAsins) recentlyAttemptedBpmRepair.add(asin)
        console.log(`[discover] bpm-repair: queuing ${missingBpmAsins.length} ASINs`)
        after(async () => {
            try {
                const { repairBpmBatch } = await import('@/integrations/data-pipeline/bpm-repair')
                await repairBpmBatch(db, missingBpmAsins)
            } catch (err) {
                console.error('[discover] bpm-repair failed:', err)
            }
        })
    } else {
        console.log('[discover] bpm-repair: nothing to queue (all ASINs have data or were already attempted)')
    }

    return products
})

/**
 * Fetch products pending enrichment. Used by background cron endpoint.
 * Not deduplicated (always fresh).
 */
export async function getStaleProducts(limit = 50) {
    const db = createFlyioDb()
    return getProductsNeedingEnrichment(db, limit)
}
