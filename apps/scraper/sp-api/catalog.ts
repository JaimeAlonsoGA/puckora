import { CONFIG } from '../config'
import { spApiCall, sleep, parseDimensions } from './client'
import type { CatalogItemResult, SpApiDimensions } from './types'

// ─── RAW CATALOG API RESPONSE ────────────────────────────────────────────────

interface RawCatalogResponse {
    asin: string
    summaries?: Array<{
        marketplaceId: string
        itemName?: string
        brand?: string
        manufacturer?: string
        modelNumber?: string
        packageQuantity?: number
        color?: string
        browseClassification?: { classificationId: string; displayName: string }
        websiteDisplayGroup?: string
        listingDate?: string  // ISO date string e.g. '2023-11-14'
    }>
    attributes?: Record<string, Array<{ value: unknown; language_tag?: string; marketplace_id?: string }>>
    dimensions?: Array<{
        marketplaceId: string
        item?: SpApiDimensions
        package?: SpApiDimensions
    }>
    images?: Array<{
        marketplaceId: string
        images: Array<{ variant: string; link: string; height: number; width: number }>
    }>
    productTypes?: Array<{ marketplaceId: string; productType: string }>
    salesRanks?: Array<{
        marketplaceId: string
        classificationRanks?: Array<{ classificationId: string; title: string; rank: number; link?: string }>
        displayGroupRanks?: Array<{ websiteDisplayGroup: string; title: string; rank: number; link?: string }>
    }>
}

// ─── getCatalogItem ───────────────────────────────────────────────────────────

export async function getCatalogItem(asin: string): Promise<CatalogItemResult | null> {
    const includedData = [
        'summaries',
        'attributes',
        'dimensions',
        'images',
        'productTypes',
        'salesRanks',
    ].join(',')

    const url =
        `https://sellingpartnerapi-na.amazon.com/catalog/2022-04-01/items/${asin}` +
        `?marketplaceIds=${CONFIG.sp_marketplace_id}&includedData=${includedData}&locale=en_US`

    await sleep(CONFIG.spapi_delay_ms)

    const raw = await spApiCall<RawCatalogResponse>(url)
    if (!raw) return null

    // ── Summaries ──────────────────────────────────────────────────────────────
    const summary =
        raw.summaries?.find(s => s.marketplaceId === CONFIG.sp_marketplace_id) ?? raw.summaries?.[0]

    // ── Attributes ─────────────────────────────────────────────────────────────
    const attrs = raw.attributes ?? {}

    const bullet_points: string[] = (attrs['bullet_point'] ?? [])
        .filter(b => !b.marketplace_id || b.marketplace_id === CONFIG.sp_marketplace_id)
        .map(b => String(b.value ?? '').trim())
        .filter(Boolean)

    // Helper: pick attribute value for current marketplace (or first available)
    const attrVal = (key: string): unknown | null => {
        const arr = attrs[key] ?? []
        const byMkt = arr.find(a => a.marketplace_id === CONFIG.sp_marketplace_id)
        const any = arr.find(a => a.value != null)
        return (byMkt ?? any)?.value ?? null
    }

    // list_price from attributes (most reliable price source)
    const rawListPrice = attrVal('list_price') as { value?: number; currency?: string } | number | null
    const list_price =
        rawListPrice != null
            ? typeof rawListPrice === 'object' && rawListPrice !== null
                ? typeof rawListPrice.value === 'number' ? Math.round(rawListPrice.value * 100) / 100 : null
                : typeof rawListPrice === 'number' ? Math.round(rawListPrice * 100) / 100 : null
            : null

    // ── Dimensions ─────────────────────────────────────────────────────────────
    const dimsEntry =
        raw.dimensions?.find(d => d.marketplaceId === CONFIG.sp_marketplace_id) ?? raw.dimensions?.[0]
    const itemDims = parseDimensions(dimsEntry?.item)
    const pkgDims = parseDimensions(dimsEntry?.package)

    // ── Images ─────────────────────────────────────────────────────────────────
    const imagesEntry =
        raw.images?.find(i => i.marketplaceId === CONFIG.sp_marketplace_id) ?? raw.images?.[0]
    // Prefer largest available — sort by pixel area descending
    const sortedImages = imagesEntry?.images
        ?.filter(i => i.variant === 'MAIN')
        .sort((a, b) => b.height * b.width - a.height * a.width)
    const main_image_url = sortedImages?.[0]?.link ?? null

    // ── Product types ──────────────────────────────────────────────────────────
    const pt =
        raw.productTypes?.find(p => p.marketplaceId === CONFIG.sp_marketplace_id) ?? raw.productTypes?.[0]

    // ── Sales ranks ────────────────────────────────────────────────────────────
    const ranksEntry =
        raw.salesRanks?.find(r => r.marketplaceId === CONFIG.sp_marketplace_id) ?? raw.salesRanks?.[0]
    // category_ranks: classification ranks only (real browse node IDs that exist in
    // amazon_categories). displayGroupRanks use string keys like
    // 'fashion_display_on_website' that are not in our DB.
    const category_ranks = (ranksEntry?.classificationRanks ?? []).map(r => ({
        classificationId: r.classificationId,
        rank: r.rank,
    }))

    return {
        title: summary?.itemName ?? null,
        brand: summary?.brand ?? null,
        manufacturer: summary?.manufacturer ?? null,
        model_number: summary?.modelNumber ?? null,
        package_quantity: summary?.packageQuantity ?? null,
        color: summary?.color ?? null,
        list_price,
        main_image_url,
        bullet_points,
        product_type: pt?.productType ?? null,
        browse_node_id: summary?.browseClassification?.classificationId ?? null,

        item_length_cm: itemDims.length_cm,
        item_width_cm: itemDims.width_cm,
        item_height_cm: itemDims.height_cm,
        item_weight_kg: itemDims.weight_kg,
        pkg_length_cm: pkgDims.length_cm,
        pkg_width_cm: pkgDims.width_cm,
        pkg_height_cm: pkgDims.height_cm,
        pkg_weight_kg: pkgDims.weight_kg,

        category_ranks,
        listing_date: (() => {
            const raw = (attrs['product_site_launch_date'] ?? [])[0]?.value
            if (!raw) return null
            const d = new Date(raw as string)
            return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
        })(),
    }
}
