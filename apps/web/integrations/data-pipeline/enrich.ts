/**
 * Data pipeline: full SP-API enrichment for scraped ASINs.
 *
 * Called by the /api/scrape/enrich route handler via after() so it runs in a
 * background task without blocking the HTTP response.
 *
 * Full pipeline per ASIN:
 *  1. getCatalogItemParsed  — catalog metadata, dimensions, sales ranks, images.
 *  2. getFeesEstimatesBatch — FBA + referral fee estimates (batched; 1 API call).
 *  3. enrichAsin            — pure data merge → ProductRow + CategoryRankRow[].
 *  4. upsertAmazonProduct   — write full row, upgrades scrape_status to 'enriched'.
 *
 * Category rank upserts are intentionally skipped here: the app-side enrichment
 * route doesn't have guaranteed amazon_categories rows for every classification
 * ID returned by SP-API. The scraper app (apps/scraper) handles rank edges via its
 * own category-crawl process.
 */

import { getCatalogItemParsed, getFeesEstimatesBatch, SP_API_MARKETPLACE_ID } from '@puckora/sp-api'
import { enrichAsin } from '@puckora/sp-api'
import { upsertAmazonProduct } from '@/services/products'
import type { AmazonProductInsert } from '@puckora/types'
import type { PgDb } from '@puckora/db'
import type { ScrapedListing } from '@puckora/scraper-core'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a puckora marketplace code ('US', 'UK', etc.) to an SP-API marketplace ID. */
function getMarketplaceId(marketplace = 'US'): string {
    return SP_API_MARKETPLACE_ID[marketplace.toUpperCase()] ?? SP_API_MARKETPLACE_ID['US']!
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface EnrichAsinResult {
    asin: string
    status: 'enriched' | 'not_found' | 'error'
    error?: string
}

/**
 * Enrich a batch of scraped listings with full SP-API catalog + fee data.
 *
 * Accepts the full ScrapedListing[] (not just ASINs) so that the price and
 * product_url from the scraper can be used as inputs to the enrichment merge.
 *
 * Processes ASINs sequentially to respect SP-API rate limits (handled inside
 * getCatalogItemParsed via acquireRateToken). Failed ASINs are logged and skipped.
 *
 * @param db          - Fly.io Drizzle PgDb instance
 * @param listings    - Scraped listings from the extension / agent
 * @param marketplace - Puckora marketplace code, defaults to 'US'
 */
export async function enrichAsinBatch(
    db: PgDb,
    listings: ScrapedListing[],
    marketplace = 'US',
): Promise<EnrichAsinResult[]> {
    if (listings.length === 0) return []

    const marketplaceId = getMarketplaceId(marketplace)
    const results: EnrichAsinResult[] = []

    // ── Step 1: fetch catalog data for all ASINs ────────────────────────────
    const catalogMap = new Map<string, Awaited<ReturnType<typeof getCatalogItemParsed>>>()
    for (const listing of listings) {
        try {
            const catalog = await getCatalogItemParsed(listing.asin, { marketplaceId })
            catalogMap.set(listing.asin, catalog)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            const isNotFound = message.includes('404')
            results.push({ asin: listing.asin, status: isNotFound ? 'not_found' : 'error', error: isNotFound ? undefined : message })
            catalogMap.set(listing.asin, null)
        }
    }

    // ── Step 2: batch fee estimates for ASINs that have a price ────────────
    const pricedItems = listings
        .filter((l) => {
            const price = l.price ?? catalogMap.get(l.asin)?.list_price
            return typeof price === 'number' && price > 0
        })
        .map((l) => ({
            asin: l.asin,
            price: (l.price ?? catalogMap.get(l.asin)?.list_price) as number,
        }))

    let feeMap: Map<string, Awaited<ReturnType<typeof getFeesEstimatesBatch>> extends Map<string, infer V> ? V : never> = new Map()
    if (pricedItems.length > 0) {
        try {
            const rawFeeMap = await getFeesEstimatesBatch(pricedItems, { marketplaceId })
            feeMap = rawFeeMap as typeof feeMap
        } catch (err) {
            console.error('[enrich] getFeesEstimatesBatch failed — proceeding without fees:', err)
        }
    }

    // ── Step 3: merge + upsert each product ────────────────────────────────
    for (const listing of listings) {
        const catalog = catalogMap.get(listing.asin) ?? null
        if (catalog === undefined) continue  // already recorded as error

        const fee = feeMap.get(listing.asin) ?? null

        try {
            const { product } = enrichAsin(
                listing.asin,
                {
                    asin: listing.asin,
                    rank: listing.rank ?? 0,
                    name: listing.name,
                    price: listing.price,
                    rating: listing.rating,
                    review_count: listing.review_count,
                    product_url: listing.product_url,
                },
                catalog,
                fee,
            )

            await upsertAmazonProduct(db, product as AmazonProductInsert)

            if (!results.find((r) => r.asin === listing.asin)) {
                results.push({ asin: listing.asin, status: catalog ? 'enriched' : 'not_found' })
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            if (!results.find((r) => r.asin === listing.asin)) {
                results.push({ asin: listing.asin, status: 'error', error: message })
            }
            console.error(`[enrich] enrichAsin failed for ${listing.asin}:`, err)
        }
    }

    return results
}

