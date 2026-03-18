/**
 * Enrichment domain types — the shapes that flow through the SP-API enrichment pipeline.
 *
 * Exported separately so consumers (scraper, web API route) can type their
 * own variables without importing from the full scraper types module.
 */

import type { AmazonProductInsert, ProductCategoryRankInsert } from '@puckora/types'
import type { ScrapedListing } from '@puckora/scraper-core'

/**
 * A scraped Amazon product that always has a numeric rank.
 * Narrowed from `ScrapedListing` (which allows rank to be null for non-ranked cards).
 */
export type ScrapedProduct = Omit<ScrapedListing, 'rank'> & { rank: number }

/**
 * A fully enriched product row ready for upsert into `amazon_products`.
 * Derived from `AmazonProductInsert` so field additions/renames are caught at compile time.
 */
export type ProductRow = Omit<AmazonProductInsert,
    'scrape_status' | 'enriched_at' | 'bullet_points' | 'product_url'
> & {
    product_url: string                        // required at write time
    bullet_points: string[]                    // non-null at write time
    scrape_status: 'enriched' | 'enrichment_failed'
    enriched_at: string                        // ISO timestamp
}

/**
 * A product–category rank edge ready for upsert into `product_category_ranks`.
 */
export type CategoryRankRow = Omit<ProductCategoryRankInsert, 'rank_type'> & {
    category_name?: string
    rank_type: 'best_seller' | 'organic'
}
