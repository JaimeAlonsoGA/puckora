/**
 * SP-API Catalog 2022-04-01 endpoint wrappers.
 *
 * Two exported functions serve different consumers:
 *
 *  `getCatalogItemParsed(asin, options?)` — battle-tested scraper form.
 *    Returns a flat `CatalogItemResult` with all fields parsed and normalised
 *    (metric dimensions, category ranks extracted, list price resolved).
 *    Used by the enrichment pipeline (apps/scraper, /api/scrape/enrich).
 *
 *  `getCatalogItem(params)` — raw API form.
 *    Returns the unmodified `CatalogItem` shape from the SP-API response.
 *    Used by data-pipeline integrations that need full attribute access.
 *
 *  `searchCatalogItems(params)` — search form.
 *    Returns a `SearchCatalogItemsResponse` with a list of matching items.
 *
 *  `parseCatalogItem(item, marketplaceId)` — pure parser, no network call.
 *    Converts an already-fetched `CatalogItem` (e.g. from searchCatalogItems)
 *    into a `CatalogItemResult`. Avoids redundant API calls when the caller
 *    already has item data in hand.
 */

import { spApiCall, parseDimensions } from './client'
import {
    SP_API_REGION_ENDPOINT,
    SP_API_MARKETPLACE_ID,
    type CatalogItemResult,
    type CatalogItem,
    type CatalogItemSummary,
    type CatalogItemSalesRank,
    type SpApiDimensions,
    type GetCatalogItemParams,
    type SearchCatalogItemsParams,
    type SearchCatalogItemsResponse,
} from './types'
import { getSpApiConfig } from './config'
import { acquireRateToken } from './rate-limiter'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getRegionEndpoint(marketplaceId: string): string {
    const endpoint = SP_API_REGION_ENDPOINT[marketplaceId]
    if (!endpoint) {
        throw new Error(`No SP-API region endpoint found for marketplace ID "${marketplaceId}"`)
    }
    return endpoint
}

// Raw response shape used only within getCatalogItemParsed
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
        listingDate?: string
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

// ---------------------------------------------------------------------------
// getCatalogItemParsed
// ---------------------------------------------------------------------------

/**
 * Fetch a single catalog item and return a fully normalised `CatalogItemResult`.
 *
 * Marketplace resolution order:
 *  1. `options.marketplaceId` (explicit)
 *  2. `options.marketplaceCode` (e.g. 'US') → resolved via SP_API_MARKETPLACE_ID
 *  3. `SP_MARKETPLACE_ID` env var → resolved via SP_API_MARKETPLACE_ID
 *  4. ATVPDKIKX0DER (US) as hard fallback
 *
 * Returns null when the ASIN is not found in the marketplace (404).
 */
export async function getCatalogItemParsed(
    asin: string,
    options: { marketplaceId?: string; marketplaceCode?: string } = {},
): Promise<CatalogItemResult | null> {
    const cfg = getSpApiConfig()

    const marketplaceId =
        options.marketplaceId ??
        (options.marketplaceCode ? SP_API_MARKETPLACE_ID[options.marketplaceCode.toUpperCase()] : undefined) ??
        cfg.marketplaceId

    const regionEndpoint = getRegionEndpoint(marketplaceId)

    const includedData = [
        'summaries',
        'attributes',
        'dimensions',
        'images',
        'productTypes',
        'salesRanks',
    ].join(',')

    const url =
        `${regionEndpoint}/catalog/2022-04-01/items/${asin}` +
        `?marketplaceIds=${marketplaceId}&includedData=${includedData}&locale=en_US`

    await acquireRateToken('getCatalogItem')
    const raw = await spApiCall<RawCatalogResponse>(url)
    if (!raw) return null

    // ── Summaries ──────────────────────────────────────────────────────────────
    const summary =
        raw.summaries?.find((s) => s.marketplaceId === marketplaceId) ?? raw.summaries?.[0]

    // ── Attributes ─────────────────────────────────────────────────────────────
    const attrs = raw.attributes ?? {}

    const bullet_points: string[] = (attrs['bullet_point'] ?? [])
        .filter((b) => !b.marketplace_id || b.marketplace_id === marketplaceId)
        .map((b) => String(b.value ?? '').trim())
        .filter(Boolean)

    // Helper: pick attribute value for current marketplace (or first available)
    const attrVal = (key: string): unknown | null => {
        const arr = attrs[key] ?? []
        const byMkt = arr.find((a) => a.marketplace_id === marketplaceId)
        const any = arr.find((a) => a.value != null)
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
        raw.dimensions?.find((d) => d.marketplaceId === marketplaceId) ?? raw.dimensions?.[0]
    const itemDims = parseDimensions(dimsEntry?.item)
    const pkgDims = parseDimensions(dimsEntry?.package)

    // ── Images ─────────────────────────────────────────────────────────────────
    const imagesEntry =
        raw.images?.find((i) => i.marketplaceId === marketplaceId) ?? raw.images?.[0]
    const sortedImages = imagesEntry?.images
        ?.filter((i) => i.variant === 'MAIN')
        .sort((a, b) => b.height * b.width - a.height * a.width)
    const main_image_url = sortedImages?.[0]?.link ?? null

    // ── Product types ──────────────────────────────────────────────────────────
    const pt =
        raw.productTypes?.find((p) => p.marketplaceId === marketplaceId) ?? raw.productTypes?.[0]

    // ── Sales ranks ────────────────────────────────────────────────────────────
    const ranksEntry =
        raw.salesRanks?.find((r) => r.marketplaceId === marketplaceId) ?? raw.salesRanks?.[0]
    // classification ranks only — displayGroupRanks use string keys not in our DB
    const category_ranks = (ranksEntry?.classificationRanks ?? []).map((r) => ({
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
            const raw_val = (attrs['product_site_launch_date'] ?? [])[0]?.value
            if (!raw_val) return null
            const d = new Date(raw_val as string)
            return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
        })(),
    }
}

// ---------------------------------------------------------------------------
// getCatalogItem — raw API form
// ---------------------------------------------------------------------------

/**
 * Fetch a single catalog item and return the raw `CatalogItem` SP-API shape.
 * Use this when you need full attribute access for custom processing.
 */
export async function getCatalogItem(params: GetCatalogItemParams): Promise<CatalogItem | null> {
    const primaryMarketplaceId = params.marketplaceIds[0]
    if (!primaryMarketplaceId) throw new Error('At least one marketplaceId required')

    const regionEndpoint = getRegionEndpoint(primaryMarketplaceId)

    const query = new URLSearchParams()
    params.marketplaceIds.forEach((id) => query.append('marketplaceIds', id))
    const includedData = params.includedData ?? [
        'attributes', 'dimensions', 'identifiers', 'images', 'productTypes', 'salesRanks', 'summaries',
    ]
    includedData.forEach((d) => query.append('includedData', d))
    if (params.locale) query.set('locale', params.locale)

    await acquireRateToken('getCatalogItem')
    return spApiCall<CatalogItem>(
        `${regionEndpoint}/catalog/2022-04-01/items/${encodeURIComponent(params.asin)}?${query.toString()}`,
    )
}

// ---------------------------------------------------------------------------
// searchCatalogItems
// ---------------------------------------------------------------------------

export async function searchCatalogItems(
    params: SearchCatalogItemsParams,
): Promise<SearchCatalogItemsResponse | null> {
    const primaryMarketplaceId = params.marketplaceIds[0]
    if (!primaryMarketplaceId) throw new Error('At least one marketplaceId required')

    const regionEndpoint = getRegionEndpoint(primaryMarketplaceId)

    const query = new URLSearchParams()
    params.marketplaceIds.forEach((id) => query.append('marketplaceIds', id))
    if (params.keywords) params.keywords.forEach((k) => query.append('keywords', k))
    if (params.brandNames) params.brandNames.forEach((b) => query.append('brandNames', b))
    if (params.classificationIds) params.classificationIds.forEach((c) => query.append('classificationIds', c))
    if (params.includedData) params.includedData.forEach((d) => query.append('includedData', d))
    if (params.identifiers) params.identifiers.forEach((i) => query.append('identifiers', i))
    if (params.identifiersType) query.set('identifiersType', params.identifiersType)
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    if (params.pageToken) query.set('pageToken', params.pageToken)
    if (params.keywordsLocale) query.set('keywordsLocale', params.keywordsLocale)
    if (params.locale) query.set('locale', params.locale)

    await acquireRateToken('searchCatalogItems')
    return spApiCall<SearchCatalogItemsResponse>(
        `${regionEndpoint}/catalog/2022-04-01/items?${query.toString()}`,
    )
}

// ---------------------------------------------------------------------------
// CatalogItem field accessors (helpers for raw-form consumers)
// ---------------------------------------------------------------------------

/** Extract item name from a SP-API CatalogItem for the given marketplace. */
export function extractCatalogTitle(item: CatalogItem, marketplaceId: string): string | null {
    return item.summaries?.find((s: CatalogItemSummary) => s.marketplaceId === marketplaceId)?.itemName ?? null
}

/** Extract brand from a SP-API CatalogItem for the given marketplace. */
export function extractCatalogBrand(item: CatalogItem, marketplaceId: string): string | null {
    return item.summaries?.find((s: CatalogItemSummary) => s.marketplaceId === marketplaceId)?.brand ?? null
}

/** Extract main product image URL from a SP-API CatalogItem. */
export function extractCatalogImage(item: CatalogItem, marketplaceId: string): string | null {
    const imageSet = item.images?.find((img) => img.marketplaceId === marketplaceId)
    if (!imageSet?.images?.length) return null
    const main = imageSet.images.find((img) => img.variant === 'MAIN') ?? imageSet.images[0]
    return main?.link ?? null
}

/** Extract Best Seller Rank from a SP-API CatalogItem. Prefers classificationRanks. */
export function extractCatalogBsr(
    item: CatalogItem,
    marketplaceId: string,
): { rank: number; category: string } | null {
    const rankSet = item.salesRanks?.find((r: CatalogItemSalesRank) => r.marketplaceId === marketplaceId)
    if (!rankSet) return null
    const classification = rankSet.classificationRanks?.[0]
    if (classification) return { rank: classification.rank, category: classification.title }
    const displayGroup = rankSet.displayGroupRanks?.[0]
    if (displayGroup) return { rank: displayGroup.rank, category: displayGroup.title }
    return null
}

// ---------------------------------------------------------------------------
// Convenience: resolve marketplace codes
// ---------------------------------------------------------------------------

/**
 * Resolve a puckora marketplace code (e.g. 'US') to an SP-API marketplace ID.
 * Throws on unknown codes.
 */
export function toSpApiMarketplaceId(marketplaceCode: string): string {
    const id = SP_API_MARKETPLACE_ID[marketplaceCode.toUpperCase()]
    if (!id) throw new Error(`Unknown puckora marketplace code: "${marketplaceCode}"`)
    return id
}

/**
 * Like `toSpApiMarketplaceId` but returns null instead of throwing.
 * Use when you want to surface unknown codes as HTTP 400.
 */
export function trySpApiMarketplaceId(marketplaceCode: string): string | null {
    return SP_API_MARKETPLACE_ID[marketplaceCode.toUpperCase()] ?? null
}

/**
 * Trim a supplier product title down to a focused SP-API search keyword.
 * Strips Chinese characters, brackets, and caps at 7 words.
 */
export function cleanSearchKeyword(title: string): string {
    const cleaned = title
        .replace(/[\u4e00-\u9fff]+/g, '')
        .replace(/[[\](){}]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    return cleaned.split(' ').filter(Boolean).slice(0, 7).join(' ')
}

// ---------------------------------------------------------------------------
// parseCatalogItem — pure parser, no network call
// ---------------------------------------------------------------------------

/**
 * Parse an already-fetched `CatalogItem` into a `CatalogItemResult`.
 *
 * Used by the keyword-search pipeline to fully parse all 20 items returned by
 * `searchCatalogItems` in one call, without making additional per-ASIN lookups.
 *
 * The parsing logic is identical to what `getCatalogItemParsed` does internally.
 * SP-API's catalog item shape is the same whether fetched individually or as part
 * of a search result batch.
 *
 * Returns null when the item is falsy or has no ASIN.
 */
export function parseCatalogItem(
    item: CatalogItem,
    marketplaceId: string,
): CatalogItemResult | null {
    if (!item?.asin) return null

    // SP-API always returns attributes as Record<string, Array<{value, language_tag?, marketplace_id?}>>
    // CatalogItem.attributes is typed as Record<string, unknown> for flexibility; safe cast here.
    type AttrEntry = { value: unknown; language_tag?: string; marketplace_id?: string }
    const attrs = (item.attributes ?? {}) as Record<string, AttrEntry[]>

    const attrVal = (key: string): unknown => {
        const arr = attrs[key] ?? []
        const byMkt = arr.find((a) => a.marketplace_id === marketplaceId)
        const any = arr.find((a) => a.value != null)
        return (byMkt ?? any)?.value ?? null
    }

    // ── Bullet points ──────────────────────────────────────────────────────────
    const bullet_points: string[] = (attrs['bullet_point'] ?? [])
        .filter((b) => !b.marketplace_id || b.marketplace_id === marketplaceId)
        .map((b) => String(b.value ?? '').trim())
        .filter(Boolean)

    // ── List price from attributes (most reliable) ─────────────────────────────
    const rawListPrice = attrVal('list_price') as { value?: number; currency?: string } | number | null
    const list_price =
        rawListPrice != null
            ? typeof rawListPrice === 'object'
                ? typeof rawListPrice.value === 'number' ? Math.round(rawListPrice.value * 100) / 100 : null
                : typeof rawListPrice === 'number' ? Math.round(rawListPrice * 100) / 100 : null
            : null

    // ── Dimensions ─────────────────────────────────────────────────────────────
    const dimsEntry =
        item.dimensions?.find((d) => d.marketplaceId === marketplaceId) ?? item.dimensions?.[0]
    const itemDims = parseDimensions(dimsEntry?.item as SpApiDimensions | undefined)
    const pkgDims = parseDimensions(dimsEntry?.package as SpApiDimensions | undefined)

    // ── Images ─────────────────────────────────────────────────────────────────
    const imagesEntry =
        item.images?.find((i) => i.marketplaceId === marketplaceId) ?? item.images?.[0]
    const mainImg = imagesEntry?.images
        ?.filter((i) => i.variant === 'MAIN')
        .sort((a, b) => b.height * b.width - a.height * a.width)[0]
    const main_image_url = mainImg?.link ?? null

    // ── Summary ────────────────────────────────────────────────────────────────
    const summary =
        item.summaries?.find((s) => s.marketplaceId === marketplaceId) ?? item.summaries?.[0]

    // ── Product type ───────────────────────────────────────────────────────────
    const pt =
        item.productTypes?.find((p) => p.marketplaceId === marketplaceId) ?? item.productTypes?.[0]

    // ── Sales ranks (classification only — we have no amazon_categories rows for displayGroups) ──
    const ranksEntry =
        item.salesRanks?.find((r) => r.marketplaceId === marketplaceId) ?? item.salesRanks?.[0]
    const category_ranks = (ranksEntry?.classificationRanks ?? []).map((r) => ({
        classificationId: r.classificationId,
        rank: r.rank,
    }))

    // ── Listing date ───────────────────────────────────────────────────────────
    const rawLaunchDate = (attrs['product_site_launch_date'] ?? [])[0]?.value
    const listing_date = (() => {
        if (!rawLaunchDate) return null
        const d = new Date(rawLaunchDate as string)
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
    })()

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
        listing_date,
    }
}
