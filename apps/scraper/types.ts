import type { AmazonProductInsert, AmazonCategory, ProductCategoryRankInsert } from '@puckora/types'

// ─── SCRAPER TYPES ────────────────────────────────────────────────────────────

export type CategoryNode = Pick<AmazonCategory,
  'id' | 'name' | 'full_path' | 'depth'
> & {
  bestsellers_url: string   // narrowed: never null at runtime
}

// Raw product as parsed from the Best Sellers HTML page
export interface ScrapedProduct {
  asin: string
  rank: number
  name: string
  price: number | null
  rating: number | null
  review_count: number | null
  product_url: string
}

// ─── SP-API TYPES ─────────────────────────────────────────────────────────────

export interface SpApiDimension {
  unit: string   // 'inches' | 'pounds' | 'centimeters' | 'kilograms'
  value: number
}

export interface SpApiDimensions {
  height?: SpApiDimension
  length?: SpApiDimension
  width?: SpApiDimension
  weight?: SpApiDimension
}

export interface SpApiImage {
  variant: string  // 'MAIN' | 'PT01' | 'PT02' | ...
  link: string
  height: number
  width: number
}

export interface SpApiSalesRank {
  classificationId: string
  title: string
  link?: string
  rank: number
}

export interface CatalogItemResult {
  title: string | null
  brand: string | null
  manufacturer: string | null
  model_number: string | null
  package_quantity: number | null
  color: string | null
  list_price: number | null
  main_image_url: string | null
  bullet_points: string[]
  product_type: string | null
  browse_node_id: string | null

  // Dimensions — all converted to metric at parse time
  item_length_cm: number | null
  item_width_cm: number | null
  item_height_cm: number | null
  item_weight_kg: number | null
  pkg_length_cm: number | null
  pkg_width_cm: number | null
  pkg_height_cm: number | null
  pkg_weight_kg: number | null

  // Date the listing first appeared on Amazon (from SP-API summaries.listingDate)
  listing_date: string | null

  // All category ranks this ASIN appears in
  category_ranks: Array<{ classificationId: string; rank: number }>
}

export interface FeeEstimateResult {
  fba_fee: number | null    // FBAPerUnitFulfillmentFee
  referral_fee: number | null           // ReferralFee
}

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

// ─── CHECKPOINT ───────────────────────────────────────────────────────────────

export interface Checkpoint {
  phase: 'scraping' | 'enriching' | 'done'
  scraped_ids: string[]   // category IDs fully scraped
  failed_scrapes: string[]   // category IDs that failed
  enriched_asins: string[]   // ASINs fully enriched
  failed_asins: string[]   // ASINs that failed enrichment
  started_at: string
  updated_at: string
}
