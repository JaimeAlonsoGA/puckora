/**
 * Amazon types — snake_case matching Python scraper Pydantic models exactly.
 * Single source of truth: apps/scraper/app/models/amazon.py
 */
import type { Marketplace } from './definitions'

/** Product physical dimensions in centimetres */
export interface ProductDimensions {
    lengthCm: number
    widthCm: number
    heightCm: number
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Maps to Python ProductSearchResult */
export interface AmazonProduct {
    asin: string
    title: string
    brand?: string | null
    price?: number | null
    currency: string
    rating?: number | null
    review_count?: number | null
    image_url?: string | null
    url?: string | null
    bsr?: number | null
    bsr_category?: string | null
    monthly_sales_est?: number | null
    marketplace: Marketplace
}

/** Maps to Python AmazonSearchResponse */
export interface AmazonSearchResponse {
    query: string
    marketplace: Marketplace
    page: number
    total?: number | null
    results: AmazonProduct[]
}

/**
 * Snapshot of the Research module state, persisted in ProductContext so
 * navigating away and back restores the last search without a re-fetch.
 */
export interface ResearchState {
    keyword: string
    filters: Partial<Record<string, unknown>>
    results: AmazonProduct[]
    total?: number
}

// ---------------------------------------------------------------------------
// Product detail
// ---------------------------------------------------------------------------

export interface ReviewItem {
    id: string
    title?: string | null
    body: string
    rating: number
    date?: string | null
    verified: boolean
    helpful_votes: number
}

/** Maps to Python AmazonProductDetail */
export interface AmazonProductDetail {
    asin: string
    marketplace: Marketplace
    title: string
    brand?: string | null
    description?: string | null
    bullet_points: string[]
    price?: number | null
    currency: string
    rating?: number | null
    review_count?: number | null
    image_urls: string[]
    bsr?: number | null
    bsr_category?: string | null
    category_path?: string | null
    dimensions?: Record<string, unknown> | null
    weight_kg?: number | null
    seller_count?: number | null
    fba_seller_count?: number | null
    monthly_sales_est?: number | null
    reviews_sample: ReviewItem[]
}

// ---------------------------------------------------------------------------
// BSR / price history (chart data — stored in DB, not scraped inline)
// ---------------------------------------------------------------------------

export interface BSRDataPoint {
    timestamp: string
    bsr: number
}

export interface PriceDataPoint {
    timestamp: string
    price: number
}

// ---------------------------------------------------------------------------
// Legacy alias — keeps callers that import AmazonSearchResult compiling
// while in transition. Remove once all callers updated.
// ---------------------------------------------------------------------------
/** @deprecated use AmazonSearchResponse */
export type AmazonSearchResult = AmazonSearchResponse
