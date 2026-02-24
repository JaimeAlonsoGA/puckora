/**
 * SP-API response types
 * Mirrors the Python models returned by /sp-api/* routes.
 */

export interface SpApiCatalogData {
    asin: string
    title: string | null
    brand: string | null
    manufacturer: string | null
    model_number: string | null
    product_type: string | null
    main_image: string | null
    bsr: number | null
    bsr_category: string | null
    marketplace: string
    source: 'sp-api' | 'stub'
}

export interface SpApiCompetitivePrice {
    condition: string | null
    belongs_to_requester: boolean
    listing_price: number | null
    landed_price: number | null
    shipping: number | null
}

export interface SpApiPricingData {
    asin: string
    marketplace: string
    buy_box_price: number | null
    buy_box_landed_price: number | null
    buy_box_condition: string | null
    total_offer_count: number | null
    lowest_new_price: number | null
    lowest_used_price: number | null
    competitive_prices: SpApiCompetitivePrice[]
    source: 'sp-api' | 'stub'
}

export interface SpApiFeesData {
    asin: string
    marketplace: string
    price: number
    referral_fee: number
    fba_fulfillment_fee: number
    variable_closing_fee: number
    total_fees: number
    fee_components: Record<string, number>
    source: 'sp-api' | 'stub'
}

export interface SpApiLookupErrors {
    catalog: string | null
    pricing: string | null
    fees: string | null
}

/** Full combined result returned by POST /sp-api/lookup */
export interface SpApiLookupResult {
    asin: string
    marketplace: string
    catalog: SpApiCatalogData | null
    pricing: SpApiPricingData | null
    fees: SpApiFeesData | null
    errors: SpApiLookupErrors
}

/** Row shape for the SP-API data table — flattened from SpApiLookupResult */
export interface SpApiTableRow {
    asin: string
    title: string | null
    brand: string | null
    product_type: string | null
    main_image: string | null
    bsr: number | null
    bsr_category: string | null
    buy_box_price: number | null
    lowest_new_price: number | null
    total_offer_count: number | null
    referral_fee: number | null
    fba_fulfillment_fee: number | null
    total_fees: number | null
    net_revenue: number | null  // buy_box_price - total_fees
    margin_pct: number | null   // net_revenue / buy_box_price * 100
    marketplace: string
    source: 'sp-api' | 'stub' | 'partial'
    errors: SpApiLookupErrors
}

/** Response from POST /sp-api/bulk-lookup */
export interface SpApiBulkLookupResult {
    results: Record<string, SpApiLookupResult>
    marketplace: string
}

/** Request params for the edge function */
export interface SpApiLookupParams {
    asin?: string
    asins?: string[]
    marketplace?: string
    price?: number
}
