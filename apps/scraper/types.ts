import type { AmazonProductInsert, AmazonCategory, ProductCategoryRankInsert } from '@puckora/types'
import type { ScrapedListing } from '@puckora/scraper-core'

// ─── SCRAPER DOMAIN TYPES ────────────────────────────────────────────────────

export type CategoryNode = Pick<AmazonCategory,
  'id' | 'name' | 'full_path' | 'depth'
> & {
  bestsellers_url: string   // narrowed: never null at runtime
}

/**
 * Best Sellers scraper always produces ranked items (non-ranked cards are
 * filtered out during parsing). Narrowed from the general ScrapedListing type.
 */
export type ScrapedProduct = Omit<ScrapedListing, 'rank'> & { rank: number }

// ─── FINAL PRODUCT ROW (as it would go into amazon_products) ─────────────────
// Derived from the DB Insert type so field additions/renames are caught at compile time.

export type ProductRow = Omit<AmazonProductInsert,
  'scrape_status' | 'enriched_at' | 'bullet_points' | 'product_url'
> & {
  product_url: string                   // required at write time
  bullet_points: string[]               // never null at write time
  scrape_status: 'enriched' | 'enrichment_failed'
  enriched_at: string                   // required at write time
}

// ─── GRAPH EDGE (product_category_ranks) ────────────────────────────────────

export type CategoryRankRow = Omit<ProductCategoryRankInsert, 'rank_type'> & {
  rank_type: 'best_seller' | 'organic'          // narrowed
}
