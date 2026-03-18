import type { ProductFinancial } from '@puckora/types'
import { coerceNumber } from './number'

export interface PriceBucket {
    range: string
    count: number
    pct: number
    is_sweet: boolean
}

export interface TopCategory {
    name: string
    count: number
}

export interface SearchOverviewStats {
    total_products: number
    avg_monthly_revenue: number
    avg_monthly_units: number
    avg_rating: number
    avg_review_count: number
    unique_brands: number
    new_listings_count: number
    fba_eligible_count: number
    avg_fba_fee: number
    avg_referral_fee: number
    avg_amazon_fee_pct: number
    avg_pkg_weight_kg: number
    price_buckets: PriceBucket[]
    top_categories: TopCategory[]
    top_products: ProductFinancial[]
}

function avg(values: Array<number | string | null | undefined>): number {
    const normalized = values
        .map((value) => coerceNumber(value))
        .filter((value): value is number => value != null)

    return normalized.length === 0
        ? 0
        : normalized.reduce((sum, value) => sum + value, 0) / normalized.length
}

function round5(value: number): number {
    return Math.round(value / 5) * 5
}

export function buildPriceBuckets(products: ProductFinancial[]): PriceBucket[] {
    const prices = products
        .map((product) => coerceNumber(product.price))
        .filter((value): value is number => value != null)

    if (prices.length === 0) return []

    const sorted = [...prices].sort((left, right) => left - right)
    const count = sorted.length
    const p25 = round5(sorted[Math.floor(count * 0.25)] ?? sorted[0])
    const p50 = round5(sorted[Math.floor(count * 0.5)] ?? sorted[0])
    const p75 = round5(sorted[Math.floor(count * 0.75)] ?? sorted[count - 1])

    const breaks = [p25, p50, p75].reduce<number[]>((accumulator, value) => {
        if (accumulator.length === 0 || value > accumulator[accumulator.length - 1]) {
            accumulator.push(value)
        }
        return accumulator
    }, [])

    if (breaks.length < 2) return []

    const [b1, b2, b3] = breaks.length === 3
        ? breaks
        : [breaks[0], breaks[1], breaks[1] + 1]

    const ranges = [
        { label: `$0–${b1}`, min: 0, max: b1 },
        { label: `$${b1}–${b2}`, min: b1, max: b2 },
        { label: `$${b2}–${b3}`, min: b2, max: b3 },
        { label: `$${b3}+`, min: b3, max: Infinity },
    ]

    const buckets = ranges.map((range) => {
        const inRange = products.filter((product) => {
            const price = coerceNumber(product.price) ?? 0
            return price > range.min && price <= range.max
        })

        const revenue = inRange.reduce(
            (sum, product) => sum + (coerceNumber(product.monthly_revenue) ?? 0),
            0,
        )

        return {
            range: range.label,
            count: inRange.length,
            pct: count > 0 ? Math.round((inRange.length / count) * 100) : 0,
            revenue,
            is_sweet: false,
        }
    })

    const sweetSpotIndex = buckets.reduce(
        (bestIndex, bucket, index) => (bucket.revenue > buckets[bestIndex].revenue ? index : bestIndex),
        0,
    )
    buckets[sweetSpotIndex].is_sweet = true

    return buckets.map(({ range, count: bucketCount, pct, is_sweet }) => ({
        range,
        count: bucketCount,
        pct,
        is_sweet,
    }))
}

export function buildTopCategories(products: ProductFinancial[], limit = 4): TopCategory[] {
    const counts = new Map<string, number>()

    for (const product of products) {
        if (!product.category_path) continue
        const leaf = product.category_path.split(' > ').pop() ?? product.category_path
        counts.set(leaf, (counts.get(leaf) ?? 0) + 1)
    }

    return [...counts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }))
}

export function computeOverviewStats(products: ProductFinancial[]): SearchOverviewStats {
    return {
        total_products: products.length,
        avg_monthly_revenue: avg(products.map((product) => product.monthly_revenue)),
        avg_monthly_units: avg(products.map((product) => product.monthly_units)),
        avg_rating: avg(products.map((product) => product.rating)),
        avg_review_count: avg(products.map((product) => product.review_count)),
        unique_brands: new Set(products.map((product) => product.brand).filter(Boolean)).size,
        new_listings_count: products.filter((product) => (product.product_age_months ?? Infinity) <= 18).length,
        fba_eligible_count: products.filter((product) => product.fba_fee != null).length,
        avg_fba_fee: avg(products.map((product) => product.fba_fee)),
        avg_referral_fee: avg(products.map((product) => product.referral_fee)),
        avg_amazon_fee_pct: avg(products.map((product) => product.amazon_fee_pct)),
        avg_pkg_weight_kg: avg(products.map((product) => product.pkg_weight_kg)),
        price_buckets: buildPriceBuckets(products),
        top_categories: buildTopCategories(products),
        top_products: [...products]
            .sort(
                (left, right) =>
                    (coerceNumber(right.monthly_revenue) ?? 0) - (coerceNumber(left.monthly_revenue) ?? 0),
            )
            .slice(0, 5),
    }
}