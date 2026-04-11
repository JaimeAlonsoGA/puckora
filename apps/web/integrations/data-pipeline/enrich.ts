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
 *  5. ensureOrganicRanks    — write SP-API organic category ranks so the
 *     product_financials view can compute estimates even without a BSR scrape.
 */

import { getCatalogItemParsed, getFeesEstimatesBatch, SP_API_MARKETPLACE_ID } from '@puckora/sp-api'
import { enrichAsin } from '@puckora/sp-api'
import { upsertAmazonProduct, upsertProductCategoryRanks, getKnownAmazonCategoryIds } from '@/services/products'
import type { AmazonProduct, AmazonProductInsert, ProductCategoryRankInsert } from '@puckora/types'
import type { PgDb } from '@puckora/db'
import { amazonCategories } from '@puckora/db'
import type { ScrapedListing } from '@puckora/scraper-core'

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a puckora marketplace code ('US', 'UK', etc.) to an SP-API marketplace ID. */
function getMarketplaceId(marketplace = 'US'): string {
    return SP_API_MARKETPLACE_ID[marketplace.toUpperCase()] ?? SP_API_MARKETPLACE_ID['US']!
}

function toRepairListing(product: AmazonProduct): ScrapedListing {
    return {
        asin: product.asin,
        rank: null,
        name: product.title ?? product.asin,
        price: product.price ?? null,
        rating: product.rating ?? null,
        review_count: product.review_count ?? null,
        product_url: product.product_url ?? `https://www.amazon.com/dp/${product.asin}`,
        bought_past_month: product.bought_past_month ?? null,
    }
}

/**
 * Upsert organic category ranks for a batch of enriched ASINs.
 *
 * Only writes ranks for category IDs that already exist in amazon_categories.
 * For unknown IDs, inserts a minimal placeholder row so the product_financials
 * view can pick up the organic rank immediately — matching the scraper's
 * ensureRankCategoriesExist behaviour.
 *
 * All ranks from SP-API salesRanks.classificationRanks are written as 'organic'.
 */
async function ensureOrganicCategoryRanks(
    db: PgDb,
    organicRanks: Array<{ asin: string; category_id: string; category_name: string; rank: number }>,
    marketplace: string,
): Promise<void> {
    if (organicRanks.length === 0) return

    const now = new Date().toISOString()
    const uniqueCategoryIds = Array.from(new Set(organicRanks.map((r) => r.category_id)))

    // Discover which categories already exist
    const knownIds = await getKnownAmazonCategoryIds(db, uniqueCategoryIds, marketplace)
    const unknownIds = uniqueCategoryIds.filter((id) => !knownIds.has(id))

    // Create minimal placeholder rows for unknown categories so rank edges land
    if (unknownIds.length > 0) {
        const categoryNameByid = new Map(organicRanks.map((r) => [r.category_id, r.category_name]))
        const placeholders = unknownIds.map((id) => {
            const name = categoryNameByid.get(id)?.trim() || `Amazon category ${id}`
            return {
                id,
                name,
                full_path: name,
                depth: 0,
                breadcrumb: [name],
                is_leaf: false,
                marketplace,
                parent_id: null,
                bestsellers_url: null,
                scrape_status: 'scraped' as const,
                last_scraped_at: null,
            }
        })
        try {
            await db
                .insert(amazonCategories)
                .values(placeholders)
                .onConflictDoNothing()
        } catch (err) {
            console.error('[enrich] ensureOrganicCategoryRanks: failed to insert placeholder categories:', err)
        }
    }

    // Write rank edges — only for ranks where category now definitely exists
    const rankRows: ProductCategoryRankInsert[] = organicRanks.map((r) => ({
        asin: r.asin,
        category_id: r.category_id,
        rank: r.rank,
        rank_type: 'organic' as const,
        observed_at: now,
    }))

    try {
        await upsertProductCategoryRanks(db, rankRows)
    } catch (err) {
        console.error('[enrich] ensureOrganicCategoryRanks: failed to upsert product_category_ranks:', err)
    }
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
    const pendingOrganicRanks: Array<{ asin: string; category_id: string; category_name: string; rank: number }> = []
    // Track which ASINs already have a result (from Step 1 catalog failures) so
    // the loop below doesn't O(n²)-scan the results array for every listing.
    const resultAsins = new Set<string>(results.map((r) => r.asin))

    for (const listing of listings) {
        const catalog = catalogMap.get(listing.asin) ?? null
        if (catalog === undefined) continue  // already recorded as error

        const fee = feeMap.get(listing.asin) ?? null

        try {
            const { product, ranks } = enrichAsin(
                listing.asin,
                {
                    asin: listing.asin,
                    rank: listing.rank ?? 0,
                    name: listing.name,
                    price: listing.price,
                    rating: listing.rating,
                    review_count: listing.review_count,
                    product_url: listing.product_url,
                    bought_past_month: listing.bought_past_month ?? null,
                },
                catalog,
                fee,
            )

            await upsertAmazonProduct(db, product as AmazonProductInsert)

            // Collect organic ranks from SP-API salesRanks for batch write below
            for (const rankRow of ranks) {
                pendingOrganicRanks.push({
                    asin: rankRow.asin,
                    category_id: rankRow.category_id,
                    category_name: rankRow.category_name ?? '',
                    rank: rankRow.rank,
                })
            }

            if (!resultAsins.has(listing.asin)) {
                results.push({ asin: listing.asin, status: catalog ? 'enriched' : 'not_found' })
                resultAsins.add(listing.asin)
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            if (!resultAsins.has(listing.asin)) {
                results.push({ asin: listing.asin, status: 'error', error: message })
                resultAsins.add(listing.asin)
            }
            console.error(`[enrich] enrichAsin failed for ${listing.asin}:`, err)
        }
    }

    // ── Step 4: write organic category ranks ───────────────────────────────
    // These come from SP-API classificationRanks and power the product_financials
    // view estimates. Without them, products have no row in the view (60% miss).
    await ensureOrganicCategoryRanks(db, pendingOrganicRanks, marketplace)

    return results
}

export async function repairKeywordProductBatch(
    db: PgDb,
    products: AmazonProduct[],
    marketplace = 'US',
): Promise<EnrichAsinResult[]> {
    return enrichAsinBatch(
        db,
        products.map(toRepairListing),
        marketplace,
    )
}

