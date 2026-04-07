import type { ProductFinancial } from '@puckora/types'
import { coerceNumber } from './number'
import { buildFbaTierDistribution, type FbaTierItem } from './fba-tiers'

export interface PriceBucket {
    range: string
    count: number
    pct: number
    is_sweet: boolean
}

export interface WeightBucket {
    range: string
    count: number
    pct: number
}

export interface BrandDistributionItem {
    name: string
    count: number
    pct: number
}

export const SEARCH_OVERVIEW_LISTING_AGE_BUCKET = {
    UNDER_12: 'under_12',
    MONTHS_12_TO_24: 'months_12_to_24',
    OVER_24: 'over_24',
} as const

export const SEARCH_OVERVIEW_LISTING_AGE_BUCKET_VALUES = [
    SEARCH_OVERVIEW_LISTING_AGE_BUCKET.UNDER_12,
    SEARCH_OVERVIEW_LISTING_AGE_BUCKET.MONTHS_12_TO_24,
    SEARCH_OVERVIEW_LISTING_AGE_BUCKET.OVER_24,
] as const

export type SearchOverviewListingAgeBucketId =
    (typeof SEARCH_OVERVIEW_LISTING_AGE_BUCKET_VALUES)[number]

export interface ListingAgeBucket {
    id: SearchOverviewListingAgeBucketId
    count: number
    pct: number
}

export interface TopCategory {
    name: string
    count: number
    /** Full category_path of the most representative product in this bucket (e.g. "Home & Kitchen > Lap Desks"). */
    path: string
}

export interface SearchOverviewStats {
    avg_price: number
    median_price: number
    price_range_min: number
    price_range_max: number
    total_products: number
    avg_monthly_revenue: number
    avg_monthly_units: number
    avg_rating: number
    median_rating: number
    avg_review_count: number
    median_review_count: number
    review_count_min: number
    review_count_max: number
    unique_brands: number
    new_listings_count: number
    recent_listings_count: number
    fba_eligible_count: number
    avg_fba_fee: number
    avg_referral_fee: number
    avg_amazon_fee_pct: number
    avg_pkg_weight_kg: number
    weight_range_min_kg: number
    weight_range_max_kg: number
    median_pkg_weight_kg: number
    median_pkg_length_cm: number
    median_pkg_width_cm: number
    median_pkg_height_cm: number
    price_buckets: PriceBucket[]
    weight_buckets: WeightBucket[]
    brand_distribution: BrandDistributionItem[]
    listing_age_buckets: ListingAgeBucket[]
    top_categories: TopCategory[]
    top_products: ProductFinancial[]
    fba_tier_distribution: FbaTierItem[]
}

function avg(values: Array<number | string | null | undefined>): number {
    const normalized = values
        .map((value) => coerceNumber(value))
        .filter((value): value is number => value != null)

    return normalized.length === 0
        ? 0
        : normalized.reduce((sum, value) => sum + value, 0) / normalized.length
}

function median(values: Array<number | string | null | undefined>): number {
    const normalized = values
        .map((value) => coerceNumber(value))
        .filter((value): value is number => value != null)
        .sort((left, right) => left - right)

    if (normalized.length === 0) return 0

    const middle = Math.floor(normalized.length / 2)
    return normalized.length % 2 === 0
        ? (normalized[middle - 1] + normalized[middle]) / 2
        : normalized[middle]
}

function getRange(values: Array<number | string | null | undefined>): { min: number; max: number } {
    const normalized = values
        .map((value) => coerceNumber(value))
        .filter((value): value is number => value != null)

    if (normalized.length === 0) return { min: 0, max: 0 }

    return {
        min: Math.min(...normalized),
        max: Math.max(...normalized),
    }
}

function round5(value: number): number {
    return Math.round(value / 5) * 5
}

export function buildPriceBuckets(
    products: ProductFinancial[],
    referenceProducts: ProductFinancial[] = products,
): PriceBucket[] {
    const pricedProducts = products.filter((product) => coerceNumber(product.price) != null)
    const prices = pricedProducts
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

    const sampledReferenceProducts = referenceProducts.filter((product) => coerceNumber(product.price) != null)

    const buckets = ranges.map((range) => {
        const inRange = pricedProducts.filter((product) => {
            const price = coerceNumber(product.price) ?? 0
            return price > range.min && price <= range.max
        })

        const referenceCount = sampledReferenceProducts.filter((product) => {
            const price = coerceNumber(product.price) ?? 0
            return price > range.min && price <= range.max
        }).length

        const referenceRevenue = inRange.reduce(
            (sum, product) => sum + (coerceNumber(product.monthly_revenue) ?? 0),
            0,
        )

        return {
            range: range.label,
            count: inRange.length,
            pct: count > 0 ? Math.round((inRange.length / count) * 100) : 0,
            referenceCount,
            referenceRevenue,
            is_sweet: false,
        }
    })

    const sweetSpotIndex = buckets.reduce(
        (bestIndex, bucket, index) => {
            const best = buckets[bestIndex]

            if (bucket.referenceCount !== best.referenceCount) {
                return bucket.referenceCount > best.referenceCount ? index : bestIndex
            }

            if (bucket.count !== best.count) {
                return bucket.count > best.count ? index : bestIndex
            }

            return bucket.referenceRevenue > best.referenceRevenue ? index : bestIndex
        },
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

export function buildWeightBuckets(products: ProductFinancial[]): WeightBucket[] {
    const weightedProducts = products.filter((product) => coerceNumber(product.pkg_weight_kg) != null)

    if (weightedProducts.length === 0) return []

    const ranges = [
        { label: '0–0.5 kg', min: 0, max: 0.5 },
        { label: '0.5–1 kg', min: 0.5, max: 1 },
        { label: '1–2 kg', min: 1, max: 2 },
        { label: '2 kg+', min: 2, max: Infinity },
    ]

    return ranges.map((range) => {
        const count = weightedProducts.filter((product) => {
            const weight = coerceNumber(product.pkg_weight_kg) ?? 0
            return weight > range.min && weight <= range.max
        }).length

        return {
            range: range.label,
            count,
            pct: weightedProducts.length > 0 ? Math.round((count / weightedProducts.length) * 100) : 0,
        }
    })
}

export function buildBrandDistribution(
    products: ProductFinancial[],
    limit = 5,
): BrandDistributionItem[] {
    const counts = new Map<string, number>()

    for (const product of products) {
        const brand = product.brand?.trim()
        if (!brand) continue
        counts.set(brand, (counts.get(brand) ?? 0) + 1)
    }

    const brandedCount = [...counts.values()].reduce((sum, count) => sum + count, 0)
    if (brandedCount === 0) return []

    return [...counts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, limit)
        .map(([name, count]) => ({
            name,
            count,
            pct: Math.round((count / brandedCount) * 100),
        }))
}

export function buildListingAgeBuckets(products: ProductFinancial[]): ListingAgeBucket[] {
    const ages = products
        .map((product) => coerceNumber(product.product_age_months))
        .filter((value): value is number => value != null)

    if (ages.length === 0) return []

    const counts: Record<SearchOverviewListingAgeBucketId, number> = {
        [SEARCH_OVERVIEW_LISTING_AGE_BUCKET.UNDER_12]: 0,
        [SEARCH_OVERVIEW_LISTING_AGE_BUCKET.MONTHS_12_TO_24]: 0,
        [SEARCH_OVERVIEW_LISTING_AGE_BUCKET.OVER_24]: 0,
    }

    for (const age of ages) {
        if (age <= 12) {
            counts[SEARCH_OVERVIEW_LISTING_AGE_BUCKET.UNDER_12] += 1
            continue
        }

        if (age <= 24) {
            counts[SEARCH_OVERVIEW_LISTING_AGE_BUCKET.MONTHS_12_TO_24] += 1
            continue
        }

        counts[SEARCH_OVERVIEW_LISTING_AGE_BUCKET.OVER_24] += 1
    }

    return SEARCH_OVERVIEW_LISTING_AGE_BUCKET_VALUES.map((id) => ({
        id,
        count: counts[id],
        pct: Math.round((counts[id] / ages.length) * 100),
    }))
}

export function buildTopCategories(products: ProductFinancial[], limit = 4): TopCategory[] {
    const counts = new Map<string, number>()
    const paths = new Map<string, string>()

    for (const product of products) {
        if (!product.category_path) continue
        const leaf = product.category_path.split(' > ').pop() ?? product.category_path
        counts.set(leaf, (counts.get(leaf) ?? 0) + 1)
        // keep first-seen full path as representative path for this leaf
        if (!paths.has(leaf)) paths.set(leaf, product.category_path)
    }

    return [...counts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count, path: paths.get(name) ?? name }))
}

/**
 * Shorten a full category path to "Root › Leaf" if it has three or more segments.
 * "Home & Kitchen > Storage > Lap Desks" → "Home & Kitchen › Lap Desks"
 */
export function shortenCategoryPath(path: string): string {
    const parts = path.split(' > ')
    if (parts.length <= 2) return path
    return `${parts[0]} › ${parts[parts.length - 1]}`
}

export function computeOverviewStats(products: ProductFinancial[]): SearchOverviewStats {
    const rankedProducts = [...products].sort(
        (left, right) =>
            (coerceNumber(right.monthly_revenue) ?? 0) - (coerceNumber(left.monthly_revenue) ?? 0),
    )
    const listingAgeBuckets = buildListingAgeBuckets(products)
    const recentListingsCount = listingAgeBuckets
        .filter((bucket) => bucket.id !== SEARCH_OVERVIEW_LISTING_AGE_BUCKET.OVER_24)
        .reduce((sum, bucket) => sum + bucket.count, 0)

    return {
        total_products: products.length,
        avg_price: avg(products.map((product) => product.price)),
        median_price: median(products.map((product) => product.price)),
        price_range_min: getRange(products.map((product) => product.price)).min,
        price_range_max: getRange(products.map((product) => product.price)).max,
        avg_monthly_revenue: avg(products.map((product) => product.monthly_revenue)),
        avg_monthly_units: avg(products.map((product) => product.monthly_units)),
        avg_rating: avg(products.map((product) => product.rating)),
        median_rating: median(products.map((product) => product.rating)),
        avg_review_count: avg(products.map((product) => product.review_count)),
        median_review_count: median(products.map((product) => product.review_count)),
        review_count_min: getRange(products.map((product) => product.review_count)).min,
        review_count_max: getRange(products.map((product) => product.review_count)).max,
        unique_brands: new Set(products.map((product) => product.brand).filter(Boolean)).size,
        new_listings_count: products.filter((product) => (product.product_age_months ?? Infinity) <= 18).length,
        recent_listings_count: recentListingsCount,
        fba_eligible_count: products.filter((product) => product.fba_fee != null).length,
        avg_fba_fee: avg(products.map((product) => product.fba_fee)),
        avg_referral_fee: avg(products.map((product) => product.referral_fee)),
        avg_amazon_fee_pct: avg(products.map((product) => product.amazon_fee_pct)),
        avg_pkg_weight_kg: avg(products.map((product) => product.pkg_weight_kg)),
        median_pkg_weight_kg: median(products.map((product) => product.pkg_weight_kg)),
        weight_range_min_kg: getRange(products.map((product) => product.pkg_weight_kg)).min,
        weight_range_max_kg: getRange(products.map((product) => product.pkg_weight_kg)).max,
        median_pkg_length_cm: median(products.map((product) => product.pkg_length_cm)),
        median_pkg_width_cm: median(products.map((product) => product.pkg_width_cm)),
        median_pkg_height_cm: median(products.map((product) => product.pkg_height_cm)),
        price_buckets: buildPriceBuckets(products, rankedProducts.slice(0, 20)),
        weight_buckets: buildWeightBuckets(products),
        brand_distribution: buildBrandDistribution(products),
        listing_age_buckets: listingAgeBuckets,
        top_categories: buildTopCategories(products),
        top_products: rankedProducts.slice(0, 9),
        fba_tier_distribution: buildFbaTierDistribution(products),
    }
}