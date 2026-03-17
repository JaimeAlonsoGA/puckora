/**
 * SP-API keyword search pipeline.
 *
 * Runs as a background task (via `after()` in the server action) immediately
 * after a search job is created. Operates fully in parallel with the extension
 * scraping track.
 *
 * What this does per search:
 *  1. Calls searchCatalogItems(keyword) — a single API call that returns up to
 *     20 items with full catalog data (attributes, images, salesRanks, dimensions).
 *  2. Parses each item with parseCatalogItem (no extra per-ASIN calls).
 *  3. Upserts amazon_products with catalog data for all returned ASINs.
 *  4. Links each ASIN to the keyword via amazon_keyword_products (idempotent).
 *  5. Updates amazon_keywords.total_results and unique_brands from refinements.
 *
 * SP-API note: scrape_status is set to 'scraped' for new products.
 * If a product was already 'enriched' from a prior search, this will temporarily
 * downgrade it. The enrichAsinBatch background task fired from /api/scrape/enrich
 * of the parallel extension track will upgrade it back to 'enriched' with fees.
 */

import {
    searchCatalogItems,
    parseCatalogItem,
    SP_API_MARKETPLACE_ID,
} from '@puckora/sp-api'
import { SCRAPE_PRODUCT_STATUS } from '@puckora/scraper-core'
import { upsertAmazonProduct } from '@/services/products'
import { updateKeyword, upsertKeywordProduct } from '@/services/keywords'
import type { AmazonProductInsert } from '@puckora/types'
import type { CatalogItemResult } from '@puckora/sp-api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

function getMarketplaceId(marketplace: string): string {
    return SP_API_MARKETPLACE_ID[marketplace.toUpperCase()] ?? SP_API_MARKETPLACE_ID['US']!
}

/**
 * Build a minimal AmazonProductInsert from a parsed CatalogItemResult.
 * Preserves all catalog fields; fees are populated by the enrichment pipeline.
 */
function buildProductInsert(
    asin: string,
    parsed: CatalogItemResult | null,
): AmazonProductInsert {
    return {
        asin,
        title: parsed?.title ?? null,
        brand: parsed?.brand ?? null,
        manufacturer: parsed?.manufacturer ?? null,
        model_number: parsed?.model_number ?? null,
        package_quantity: parsed?.package_quantity ?? null,
        color: parsed?.color ?? null,
        price: parsed?.list_price ?? null,
        main_image_url: parsed?.main_image_url ?? null,
        bullet_points: parsed?.bullet_points ?? [],
        product_type: parsed?.product_type ?? null,
        browse_node_id: parsed?.browse_node_id ?? null,
        item_length_cm: parsed?.item_length_cm ?? null,
        item_width_cm: parsed?.item_width_cm ?? null,
        item_height_cm: parsed?.item_height_cm ?? null,
        item_weight_kg: parsed?.item_weight_kg ?? null,
        pkg_length_cm: parsed?.pkg_length_cm ?? null,
        pkg_width_cm: parsed?.pkg_width_cm ?? null,
        pkg_height_cm: parsed?.pkg_height_cm ?? null,
        pkg_weight_kg: parsed?.pkg_weight_kg ?? null,
        listing_date: parsed?.listing_date ?? null,
        scrape_status: SCRAPE_PRODUCT_STATUS.SCRAPED,
        updated_at: new Date().toISOString(),
    }
}

/**
 * Execute the SP-API keyword search for a given keyword search row.
 *
 * @param supabase   - Admin Supabase client (bypasses RLS)
 * @param keywordId  - ID of the pre-created amazon_keywords stub row
 * @param keyword    - Raw search term (e.g. "lap desk")
 * @param marketplace - Puckora marketplace code (e.g. "US")
 */
export async function runKeywordSearch(
    supabase: SupabaseInstance,
    keywordId: string,
    keyword: string,
    marketplace: string,
): Promise<void> {
    const marketplaceId = getMarketplaceId(marketplace)

    const response = await searchCatalogItems({
        keywords: [keyword],
        marketplaceIds: [marketplaceId],
        includedData: ['summaries', 'attributes', 'images', 'salesRanks', 'productTypes', 'dimensions'],
        pageSize: 20,
        locale: 'en_US',
    })

    if (!response) {
        console.error(`[keyword-search] searchCatalogItems returned null for "${keyword}"`)
        return
    }

    // Update keyword row with aggregate data from refinements
    await updateKeyword(supabase, keywordId, {
        total_results: response.numberOfResults,
        unique_brands: response.refinements?.brands?.length ?? null,
    })

    // Process each item in page-rank order
    for (const [idx, item] of response.items.entries()) {
        const rank = idx + 1
        const parsed = parseCatalogItem(item, marketplaceId)

        try {
            // Upsert product first (FK required by keyword_products)
            await upsertAmazonProduct(supabase, buildProductInsert(item.asin, parsed))

            // Link ASIN to this keyword search
            await upsertKeywordProduct(supabase, {
                keyword_id: keywordId,
                asin: item.asin,
            })
        } catch (err) {
            // Log and skip; don't abort the entire batch
            console.error(`[keyword-search] failed for ASIN ${item.asin} (rank ${rank}):`, err)
        }
    }
}
