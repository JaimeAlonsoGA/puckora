/**
 * Shared types for the Pulse module.
 * No server-side imports — safe to use in both RSC and Client Components.
 */

import type { Scraper1688QuantityPrice } from '@/lib/apify/types'

export interface PulseItem {
    id: string
    supplierId: string
    alibabaProductId: string
    title: string
    imageUrl: string | null
    /** Price in USD */
    priceUsd: number | null
    /** Raw price string e.g. "28.50 ($3.99)" */
    priceRaw: string
    moq: number
    orderCount: number
    /** Repurchase % as integer e.g. 18 */
    repurchaseRate: number
    detailUrl: string
    shopName: string
    /** Human-readable location e.g. "Guangdong, China" */
    location: string
    quantityPrices: Scraper1688QuantityPrice[]
    serviceTags: string[]
    productBadges: string[]
    productSpecs: string[]
    /** 0–100 computed server-side */
    opportunityScore: number
    isCertifiedFactory: boolean
    supplierIsVerified: boolean | null
}

export interface PulseSearchResponse {
    items: PulseItem[]
    cached: boolean
    keyword: string
}

export interface AmazonMatchResult {
    asin: string
    title: string | null
    brand: string | null
    imageUrl: string | null
    bsr: number | null
    bsrCategory: string | null
    amazonUrl: string
}

export interface AmazonMatchResponse {
    found: boolean
    results: AmazonMatchResult[]
    marketplace: string
}
