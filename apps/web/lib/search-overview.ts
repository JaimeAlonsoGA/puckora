// ─────────────────────────────────────────────────────────────────────────────
// Search overview — pure aggregation utils
// All inputs: ProductFinancial[] from the product_financials view.
// No invented fields. Everything derivable from real DB columns.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProductFinancial } from '@puckora/types'

// ── Output types ──────────────────────────────────────────────────────────────

export interface PriceBucket {
    range: string
    count: number
    pct: number
    /** True for the bucket with the highest total monthly_revenue. */
    is_sweet: boolean
}

export interface TopCategory {
    name: string
    count: number
}

export interface SearchOverviewStats {
    total_products: number

    // Revenue & volume — from monthly_revenue / monthly_units
    avg_monthly_revenue: number
    avg_monthly_units: number

    // Market quality — from rating / review_count
    avg_rating: number
    avg_review_count: number

    // Competition & opportunity signals
    unique_brands: number
    new_listings_count: number        // product_age_months <= 18
    fba_eligible_count: number        // fba_fee IS NOT NULL

    // Amazon fee breakdown — price - total_amazon_fees, no COGS
    avg_fba_fee: number
    avg_referral_fee: number
    avg_amazon_fee_pct: number        // fraction 0–1  (e.g. 0.33 = 33%)
    avg_pkg_weight_kg: number

    price_buckets: PriceBucket[]
    top_categories: TopCategory[]
    top_products: ProductFinancial[]  // top 5 by monthly_revenue
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(vals: (number | null | undefined)[]): number {
    const valid = vals.filter((v): v is number => v != null)
    return valid.length === 0 ? 0 : valid.reduce((a, b) => a + b, 0) / valid.length
}

// ── Price bucketing ───────────────────────────────────────────────────────────
// Uses actual price quartiles (p25 / p50 / p75) rounded to nearest $5 as
// breakpoints so that bucket labels always reflect the real distribution.

function round5(v: number): number {
    return Math.round(v / 5) * 5
}

export function buildPriceBuckets(products: ProductFinancial[]): PriceBucket[] {
    const prices = products.map(p => p.price).filter((v): v is number => v != null)
    if (prices.length === 0) return []

    const sorted = [...prices].sort((a, b) => a - b)
    const n = sorted.length

    const p25 = round5(sorted[Math.floor(n * 0.25)] ?? sorted[0])
    const p50 = round5(sorted[Math.floor(n * 0.5)] ?? sorted[0])
    const p75 = round5(sorted[Math.floor(n * 0.75)] ?? sorted[n - 1])

    // Guarantee strictly increasing breakpoints
    const breaks = [p25, p50, p75].reduce<number[]>((acc, v) => {
        if (acc.length === 0 || v > acc[acc.length - 1]) acc.push(v)
        return acc
    }, [])

    if (breaks.length < 2) return []  // not enough price variation to bucket
    const [b1, b2, b3] = breaks.length === 3
        ? breaks
        : [breaks[0], breaks[1], breaks[1] + 1]

    const ranges = [
        { label: `$0–${b1}`, min: 0, max: b1 },
        { label: `$${b1}–${b2}`, min: b1, max: b2 },
        { label: `$${b2}–${b3}`, min: b2, max: b3 },
        { label: `$${b3}+`, min: b3, max: Infinity },
    ]

    const buckets = ranges.map(r => {
        const inRange = products.filter(p => {
            const price = p.price ?? 0
            return price > r.min && price <= r.max
        })
        const revenue = inRange.reduce((s, p) => s + (p.monthly_revenue ?? 0), 0)
        return {
            range: r.label,
            count: inRange.length,
            pct: n > 0 ? Math.round((inRange.length / n) * 100) : 0,
            revenue,
            is_sweet: false,
        }
    })

    // Sweet spot = bucket capturing the most total monthly_revenue
    const maxIdx = buckets.reduce((best, b, i) => b.revenue > buckets[best].revenue ? i : best, 0)
    buckets[maxIdx].is_sweet = true

    return buckets.map(({ range, count, pct, is_sweet }) => ({ range, count, pct, is_sweet }))
}

// ── Category aggregation ──────────────────────────────────────────────────────

export function buildTopCategories(products: ProductFinancial[], limit = 4): TopCategory[] {
    const counts = new Map<string, number>()
    for (const p of products) {
        if (!p.category_path) continue
        // Use the leaf segment (last part of breadcrumb path)
        const leaf = p.category_path.split(' > ').pop() ?? p.category_path
        counts.set(leaf, (counts.get(leaf) ?? 0) + 1)
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }))
}

// ── Main aggregator ────────────────────────────────────────────────────────────

export function computeOverviewStats(products: ProductFinancial[]): SearchOverviewStats {
    const n = products.length
    return {
        total_products: n,
        avg_monthly_revenue: avg(products.map(p => p.monthly_revenue)),
        avg_monthly_units: avg(products.map(p => p.monthly_units)),
        avg_rating: avg(products.map(p => p.rating)),
        avg_review_count: avg(products.map(p => p.review_count)),
        unique_brands: new Set(products.map(p => p.brand).filter(Boolean)).size,
        new_listings_count: products.filter(p => (p.product_age_months ?? Infinity) <= 18).length,
        fba_eligible_count: products.filter(p => p.fba_fee != null).length,
        avg_fba_fee: avg(products.map(p => p.fba_fee)),
        avg_referral_fee: avg(products.map(p => p.referral_fee)),
        avg_amazon_fee_pct: avg(products.map(p => p.amazon_fee_pct)),
        avg_pkg_weight_kg: avg(products.map(p => p.pkg_weight_kg)),
        price_buckets: buildPriceBuckets(products),
        top_categories: buildTopCategories(products),
        top_products: [...products]
            .sort((a, b) => (b.monthly_revenue ?? 0) - (a.monthly_revenue ?? 0))
            .slice(0, 5),
    }
}
