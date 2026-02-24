/**
 * Alibaba / sourcing types — snake_case matching Python scraper Pydantic models.
 * Single source of truth: apps/scraper/app/models/alibaba.py
 */

// ---------------------------------------------------------------------------
// Core types — map 1:1 to Python AlibabaSupplierBasic / AlibabaProductResult
// ---------------------------------------------------------------------------

export interface PriceRange {
    min?: number | null
    max?: number | null
    currency: string
}

export interface AlibabaSupplierBasic {
    id: string
    name: string
    country?: string | null
    verified: boolean
    years_on_platform?: number | null
    response_rate?: number | null
    url?: string | null
    logo_url?: string | null
}

/** A single product result from Alibaba — maps to Python AlibabaProductResult */
export interface AlibabaProductResult {
    id: string
    title: string
    supplier: AlibabaSupplierBasic
    min_order_quantity?: number | null
    price_range?: PriceRange | null
    image_url?: string | null
    url?: string | null
}

/** Maps to Python AlibabaSearchResponse */
export interface AlibabaSearchResponse {
    query: string
    page: number
    total: number
    results: AlibabaProductResult[]
}

// ---------------------------------------------------------------------------
// Legacy aliases — keep old names compiling during transition
// ---------------------------------------------------------------------------
/** @deprecated use AlibabaProductResult */
export type AlibabaProduct = AlibabaProductResult
/** @deprecated use AlibabaSearchResponse */
export type AlibabaSearchResult = AlibabaSearchResponse
/** @deprecated use AlibabaSupplierBasic */
export type AlibabaSupplier = AlibabaSupplierBasic & {
    supplierId: string
    supplierName: string
}
