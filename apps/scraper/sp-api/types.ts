// ─── SP-API RAW DIMENSION TYPES ───────────────────────────────────────────────

export interface SpApiDimension {
    unit: string  // 'inches' | 'pounds' | 'centimeters' | 'kilograms'
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

// ─── PARSED CATALOG RESULT ────────────────────────────────────────────────────

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

// ─── FEE ESTIMATE RESULT ──────────────────────────────────────────────────────

export interface FeeEstimateResult {
    fba_fee: number | null      // FBAPerUnitFulfillmentFee
    referral_fee: number | null // ReferralFee
}
