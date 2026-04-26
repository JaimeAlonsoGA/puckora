/**
 * Financial computation — single source of truth for all revenue estimates.
 *
 * `bought_past_month` is the only demand signal used for monthly_units.
 * This is Amazon's own ground-truth data. When absent, monthly_units is null.
 * BSR power-law estimation has been removed: it was too inaccurate to show users.
 */
import type { AmazonProduct, ProductFinancial } from '@puckora/types'

// ---------------------------------------------------------------------------
// Age helpers
// ---------------------------------------------------------------------------

export function getProductAgeMonths(listingDate: string | null | undefined): number | null {
    if (!listingDate) return null
    const date = new Date(listingDate)
    if (Number.isNaN(date.getTime())) return null
    const now = new Date()
    const months =
        (now.getUTCFullYear() - date.getUTCFullYear()) * 12 +
        now.getUTCMonth() -
        date.getUTCMonth()
    return Math.max(1, months)
}

// ---------------------------------------------------------------------------
// BSR row shape — result of rank lookup queries (typed cast from raw SQL rows)
// ---------------------------------------------------------------------------

export interface BsrRow {
    category_id: string | null
    rank: number | null
    rank_type: string | null
    category_depth: number | null
    category_path: string | null
    observed_at: string | null
}

// ---------------------------------------------------------------------------
// Core builder — combines AmazonProduct + optional BSR context into the
// shared ProductFinancial shape consumed by all views and API responses.
// ---------------------------------------------------------------------------

export function buildProductFinancial(
    product: AmazonProduct,
    bsr: BsrRow | null,
): ProductFinancial {
    const { price, fba_fee, referral_fee, bought_past_month, listing_date, review_count } =
        product

    // Fees
    const total_amazon_fees =
        fba_fee != null && referral_fee != null ? r2(fba_fee + referral_fee) : null
    const amazon_fee_pct =
        total_amazon_fees != null && price != null && price > 0
            ? r1((total_amazon_fees / price) * 100)
            : null
    const net_per_unit =
        price != null && fba_fee != null && referral_fee != null
            ? r2(price - fba_fee - referral_fee)
            : null

    // Core: bought_past_month is Amazon's ground-truth demand signal.
    // When absent (badge not shown on the product), monthly_units is null.
    // 0 means "repair ran, badge absent" — treat as no signal.
    const monthly_units =
        bought_past_month != null && bought_past_month > 0 ? bought_past_month : null
    const confidence: string = monthly_units != null ? 'high' : 'low'

    // Revenue
    const monthly_revenue =
        monthly_units != null && price != null && price > 0
            ? r2(monthly_units * price)
            : null
    const monthly_net =
        monthly_units != null && net_per_unit != null ? r2(monthly_units * net_per_unit) : null
    const daily_velocity = monthly_units != null ? r1(monthly_units / 30) : null

    // Meta
    const product_age_months = getProductAgeMonths(listing_date)
    const review_rate_per_month =
        product_age_months != null && review_count != null && review_count > 0
            ? r2(review_count / product_age_months)
            : null

    return {
        asin: product.asin,
        category_id: bsr?.category_id ?? null,
        rank: bsr?.rank ?? null,
        rank_type: bsr?.rank_type ?? null,
        category_depth: bsr?.category_depth ?? null,
        category_path: bsr?.category_path ?? null,
        observed_at: bsr?.observed_at ?? product.updated_at,
        title: product.title,
        brand: product.brand,
        product_type: product.product_type,
        main_image_url: product.main_image_url,
        price: product.price,
        rating: product.rating,
        review_count: product.review_count,
        fba_fee,
        referral_fee,
        total_amazon_fees,
        amazon_fee_pct,
        net_per_unit,
        monthly_units_bsr: null,
        monthly_units_review: null,
        monthly_units,
        // Expose 0 as null: 0 means "repair ran, no badge" which is indistinguishable
        // from "no data" for display purposes. Non-zero values are real Amazon demand signals.
        bought_past_month: (product.bought_past_month ?? 0) > 0 ? product.bought_past_month : null,
        monthly_revenue,
        monthly_net,
        daily_velocity,
        w_bsr: null,
        w_review: null,
        confidence,
        product_type_mismatch: false,
        product_age_months,
        listing_date: product.listing_date,
        review_rate_per_month,
        pkg_weight_kg: product.pkg_weight_kg,
        pkg_length_cm: product.pkg_length_cm,
        pkg_width_cm: product.pkg_width_cm,
        pkg_height_cm: product.pkg_height_cm,
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function r2(n: number): number {
    return Math.round(n * 100) / 100
}

function r1(n: number): number {
    return Math.round(n * 10) / 10
}
