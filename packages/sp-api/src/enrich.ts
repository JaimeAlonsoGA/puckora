/**
 * SP-API enrichment — merge scraped data with SP-API catalog + fee data.
 *
 * `enrichAsin` is the single point where a scraped listing, a catalog result,
 * and a fee estimate are combined into a DB-ready `ProductRow` and its
 * associated `CategoryRankRow[]` (organic sales-rank edges).
 *
 * Separation of concerns:
 *  - This function never makes network calls. It is a pure data merge.
 *  - Network calls (getCatalogItemParsed, getFeesEstimatesBatch) are the
 *    caller's responsibility (apps/scraper/index.ts, /api/scrape/enrich).
 *  - Category rank edges from scraped best-seller positions are also the
 *    caller's responsibility to include (they are not produced here).
 */

import { SCRAPE_PRODUCT_STATUS } from '@puckora/scraper-core'
import type { CatalogItemResult, ParsedFeeEstimate } from './types'
import type { ScrapedProduct, ProductRow, CategoryRankRow } from './enrichment-types'

export type { ScrapedProduct, ProductRow, CategoryRankRow }

/**
 * Build a fully-enriched `ProductRow` and its organic `CategoryRankRow[]` from
 * scraped + SP-API catalog + SP-API fee data for a single ASIN.
 *
 * @param asin      - 10-character Amazon ASIN
 * @param scraped   - Listing data from HTML scraping (always present)
 * @param catalog   - SP-API catalog result (null when enrichment failed / ASIN not found)
 * @param feeResult - SP-API fee estimate (null when not available)
 */
export function enrichAsin(
    asin: string,
    scraped: ScrapedProduct,
    catalog: CatalogItemResult | null,
    feeResult: ParsedFeeEstimate | null,
): { product: ProductRow; ranks: CategoryRankRow[] } {
    const now = new Date().toISOString()

    const product: ProductRow = {
        // From scraper
        asin,
        price: catalog?.list_price ?? scraped.price,
        rating: scraped.rating,
        review_count: scraped.review_count,
        product_url: scraped.product_url,

        // From SP-API catalog (null if enrichment failed)
        title: catalog?.title ?? scraped.name,         // fallback to scraped name
        brand: catalog?.brand ?? null,
        manufacturer: catalog?.manufacturer ?? null,
        model_number: catalog?.model_number ?? null,
        package_quantity: catalog?.package_quantity ?? null,
        color: catalog?.color ?? null,
        main_image_url: catalog?.main_image_url ?? null,
        bullet_points: catalog?.bullet_points ?? [],
        product_type: catalog?.product_type ?? null,
        browse_node_id: catalog?.browse_node_id ?? null,
        item_length_cm: catalog?.item_length_cm ?? null,
        item_width_cm: catalog?.item_width_cm ?? null,
        item_height_cm: catalog?.item_height_cm ?? null,
        item_weight_kg: catalog?.item_weight_kg ?? null,
        pkg_length_cm: catalog?.pkg_length_cm ?? null,
        pkg_width_cm: catalog?.pkg_width_cm ?? null,
        pkg_height_cm: catalog?.pkg_height_cm ?? null,
        pkg_weight_kg: catalog?.pkg_weight_kg ?? null,

        // From SP-API fees
        fba_fee: feeResult?.fba_fee ?? null,
        referral_fee: feeResult?.referral_fee ?? null,

        listing_date: catalog?.listing_date ?? null,

        scrape_status: catalog
            ? SCRAPE_PRODUCT_STATUS.ENRICHED
            : SCRAPE_PRODUCT_STATUS.ENRICHMENT_FAILED,
        enriched_at: now,
    }

    // Organic ranks from SP-API salesRanks — all categories this ASIN ranks in
    const ranks: CategoryRankRow[] = (catalog?.category_ranks ?? []).map((r) => ({
        asin,
        category_id: r.classificationId,
        rank: r.rank,
        rank_type: 'organic' as const,
        observed_at: now,
    }))

    return { product, ranks }
}
