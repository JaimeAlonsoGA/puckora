import type { Json } from '@puckora/types'
/**
 * Data pipeline: Global Sources suppliers & products.
 *
 * Uses two Apify actors:
 *   - devcake/globalsources-supplier-scraper   → suppliers table
 *   - devcake/globalsources-products-scraper   → supplier_products table
 */

import { runApifyActor } from '@/lib/apify/client'
import { APIFY_ACTOR_ID } from '@/lib/apify/types'
import type {
    GlobalSourcesSupplierInput,
    GlobalSourcesSupplierOutput,
    GlobalSourcesProductsInput,
    GlobalSourcesProductOutput,
} from '@/lib/apify/types'
import { upsertSuppliers, upsertSupplierProducts } from '@/lib/services/suppliers'
import type { SupplierInsert, SupplierProductInsert } from '@puckora/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

// ---------------------------------------------------------------------------
// Normalise GlobalSources supplier → SupplierInsert
// ---------------------------------------------------------------------------

function normaliseGlobalSourcesSupplier(raw: GlobalSourcesSupplierOutput): SupplierInsert {
    const now = new Date().toISOString()
    return {
        alibaba_id: `gs_${raw.supplier_id}`,
        name: raw.company_name,
        country: raw.location,
        url: raw.profile_url,
        is_gold_supplier: false,
        is_verified: raw.verification.is_verified_supplier || raw.verification.is_verified_manufacturer,
        is_trade_assurance: false,
        years_on_platform: raw.verification.years_on_platform
            ? parseInt(raw.verification.years_on_platform)
            : null,
        avg_rating: null,
        total_reviews: null,
        response_rate_pct: null,
        response_time_hours: null,
        employees_count: null,
        annual_revenue_usd: null,
        main_products: raw.sample_products.map((p) => p.name),
        main_categories: raw.business_info.types,
        certifications: [
            ...raw.certifications.company,
            ...(raw.certifications.product ? raw.certifications.product.split(',').map((c) => c.trim()) : []),
        ],
        trade_assurance: false,
        raw_data: raw as unknown as Json,
        scraped_at: now,
        needs_refresh_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: now,
    }
}

// ---------------------------------------------------------------------------
// Normalise GlobalSources product → SupplierProductInsert
// ---------------------------------------------------------------------------

function parseFobPrice(priceStr: string | null): { min: number | null; max: number | null } {
    if (!priceStr) return { min: null, max: null }
    const matches = priceStr.match(/[\d.]+/g)
    if (!matches) return { min: null, max: null }
    const nums = matches.map(Number)
    return { min: nums[0] ?? null, max: nums[1] ?? nums[0] ?? null }
}

function normaliseGlobalSourcesProduct(
    raw: GlobalSourcesProductOutput,
    supplierId: string,
): SupplierProductInsert {
    const { min, max } = parseFobPrice(raw.price)
    const now = new Date().toISOString()

    return {
        alibaba_product_id: `gs_${raw.product_id}`,
        supplier_id: supplierId,
        title: raw.product_name,
        price_min: min,
        price_max: max,
        currency: raw.price_currency?.includes('US') ? 'USD' : 'USD',
        moq: raw.min_order_quantity ?? 1,
        lead_time_days: raw.lead_time_days,
        image_url: raw.image_url,
        categories: raw.category_name ? [raw.category_name] : null,
        keywords: null,
        price_tiers: null,
        shipping_options: raw.fob_port ? [raw.fob_port] : null,
        is_customizable: raw.supplier_business_types.some((t) =>
            /OEM|ODM|Custom/i.test(t),
        ),
        data_source: 'globalsources',
        raw_data: raw as unknown as Json,
        scraped_at: now,
        updated_at: now,
    }
}

// ---------------------------------------------------------------------------
// Public pipeline functions
// ---------------------------------------------------------------------------

export interface FetchGlobalSourcesOptions {
    keywords: string[]
    verifiedManufacturerOnly?: boolean
    minVerificationLevel?: number
    maxSuppliers?: number
}

export interface FetchGlobalSourcesResult {
    suppliersUpserted: number
    errors: string[]
}

/**
 * Fetch GlobalSources suppliers for given keywords.
 */
export async function fetchAndPersistGlobalSourcesSuppliers(
    supabase: SupabaseInstance,
    options: FetchGlobalSourcesOptions,
): Promise<FetchGlobalSourcesResult> {
    const errors: string[] = []
    let rawItems: GlobalSourcesSupplierOutput[] = []

    try {
        rawItems = await runApifyActor<GlobalSourcesSupplierInput, GlobalSourcesSupplierOutput>(
            APIFY_ACTOR_ID.globalSourcesSuppliers,
            {
                searchKeywords: options.keywords,
                verifiedManufacturerOnly: options.verifiedManufacturerOnly ?? false,
                minVerificationLevel: options.minVerificationLevel ?? 0,
                maxSuppliers: options.maxSuppliers ?? 100,
                proxyConfiguration: { useApifyProxy: true },
            },
        )
    } catch (err) {
        errors.push(String(err))
        return { suppliersUpserted: 0, errors }
    }

    const inserts = rawItems.map(normaliseGlobalSourcesSupplier)
    try {
        const upserted = await upsertSuppliers(supabase, inserts)
        return { suppliersUpserted: upserted.length, errors }
    } catch (err) {
        errors.push(String(err))
        return { suppliersUpserted: 0, errors }
    }
}

export interface FetchGlobalSourcesProductsOptions {
    keywords: string[]
    maxPagesPerKeyword?: number
    minVerificationLevel?: number
    fobPriceMin?: number
    fobPriceMax?: number
}

export interface FetchGlobalSourcesProductsResult {
    productsUpserted: number
    errors: string[]
}

/**
 * Fetch GlobalSources products. Resolves supplier IDs by upserting supplier
 * records extracted from the product data.
 */
export async function fetchAndPersistGlobalSourcesProducts(
    supabase: SupabaseInstance,
    options: FetchGlobalSourcesProductsOptions,
): Promise<FetchGlobalSourcesProductsResult> {
    const errors: string[] = []
    let rawItems: GlobalSourcesProductOutput[] = []

    try {
        rawItems = await runApifyActor<GlobalSourcesProductsInput, GlobalSourcesProductOutput>(
            APIFY_ACTOR_ID.globalSourcesProducts,
            {
                keywords: options.keywords,
                maxPagesPerKeyword: options.maxPagesPerKeyword ?? 2,
                minVerificationLevel: options.minVerificationLevel ?? 0,
                fobPriceMin: options.fobPriceMin ?? 0,
                fobPriceMax: options.fobPriceMax ?? 0,
                proxyConfiguration: {
                    useApifyProxy: true,
                    apifyProxyGroups: ['RESIDENTIAL'],
                },
            },
        )
    } catch (err) {
        errors.push(String(err))
        return { productsUpserted: 0, errors }
    }

    // Group by supplier
    const bySupplierId = new Map<string, GlobalSourcesProductOutput[]>()
    for (const item of rawItems) {
        const key = item.supplier_id ?? `gs_name_${item.supplier_name}`
        if (!bySupplierId.has(key)) bySupplierId.set(key, [])
        bySupplierId.get(key)!.push(item)
    }

    let totalUpserted = 0
    for (const [, items] of bySupplierId.entries()) {
        const firstItem = items[0]!
        const supplierId = firstItem.supplier_id ?? `gs_name_${firstItem.supplier_name}`

        // Build a minimal supplier insert from product data
        const supplierInsert: SupplierInsert = {
            alibaba_id: `gs_${supplierId}`,
            name: firstItem.supplier_name,
            country: firstItem.supplier_location,
            url: null,
            is_gold_supplier: false,
            is_verified: firstItem.is_verified_supplier || firstItem.is_verified_manufacturer,
            is_trade_assurance: false,
            years_on_platform: firstItem.supplier_years_on_platform
                ? parseInt(firstItem.supplier_years_on_platform)
                : null,
            avg_rating: null,
            total_reviews: null,
            main_categories: firstItem.supplier_business_types,
            certifications: firstItem.supplier_company_certs
                ? firstItem.supplier_company_certs.split(',').map((c) => c.trim())
                : null,
            trade_assurance: false,
            raw_data: null,
            scraped_at: new Date().toISOString(),
            needs_refresh_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        }

        try {
            const [supplier] = await upsertSuppliers(supabase, [supplierInsert])
            if (!supplier) continue
            const productInserts = items.map((item) =>
                normaliseGlobalSourcesProduct(item, supplier.id),
            )
            const upserted = await upsertSupplierProducts(supabase, productInserts)
            totalUpserted += upserted.length
        } catch (err) {
            errors.push(`Supplier ${firstItem.supplier_name}: ${String(err)}`)
        }
    }

    return { productsUpserted: totalUpserted, errors }
}
