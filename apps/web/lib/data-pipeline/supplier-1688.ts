import type { Json } from '@puckora/types'
/**
 * Data pipeline: 1688.com products.
 *
 * Fetches product listings from Apify (devcake/1688-com-products-scraper),
 * normalises and upserts into Supabase `supplier_products` table via
 * a placeholder supplier record (1688 doesn't provide supplier IDs directly).
 */

import { runApifyActor } from '@/lib/apify/client'
import { APIFY_ACTOR_ID } from '@/lib/apify/types'
import type { Scraper1688Input, Scraper1688Output } from '@/lib/apify/types'
import { upsertSupplier, upsertSupplierProducts } from '@/lib/services/suppliers'
import type { SupplierInsert, SupplierProductInsert } from '@puckora/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

/** Parse CNY price string like "28.50 ($3.99)" → { cny: 28.5, usd: 3.99 } */
function parsePriceStr(priceStr: string): { cny: number | null; usd: number | null } {
    const cnyMatch = priceStr.match(/^([\d.]+)/)
    const usdMatch = priceStr.match(/\$(\s*[\d.]+)/)
    return {
        cny: cnyMatch ? parseFloat(cnyMatch[1]) : null,
        usd: usdMatch ? parseFloat(usdMatch[1].trim()) : null,
    }
}

/** Build a synthetic supplier record from the shop name */
function buildSupplierInsert(raw: Scraper1688Output): SupplierInsert {
    const now = new Date().toISOString()
    // Use shop_name + province as stable ID since 1688 doesn't expose supplier IDs
    const syntheticId = `1688_${raw.member_id}`
    return {
        alibaba_id: syntheticId,
        name: raw.shop_name,
        country: 'China',
        url: null,
        is_gold_supplier: false,
        is_verified: false,
        is_trade_assurance: false,
        years_on_platform: null,
        avg_rating: null,
        total_reviews: null,
        response_rate_pct: null,
        response_time_hours: null,
        employees_count: null,
        annual_revenue_usd: null,
        main_products: null,
        main_categories: null,
        certifications: null,
        trade_assurance: false,
        raw_data: null,
        scraped_at: now,
        needs_refresh_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: now,
    }
}

function normalise1688ProductInsert(
    raw: Scraper1688Output,
    supplierId: string,
): SupplierProductInsert {
    const { usd } = parsePriceStr(raw.price)
    const now = new Date().toISOString()

    // Build tiered pricing from quantity_prices
    const priceTiers =
        raw.quantity_prices.length > 0
            ? raw.quantity_prices.map((qp) => ({
                quantity: qp.quantity,
                price_cny: parseFloat(qp.price) || null,
                price_usd: parseFloat(qp.price_usd.replace('$', '').trim()) || null,
            }))
            : null

    return {
        alibaba_product_id: `1688_${raw.offer_id}`,
        supplier_id: supplierId,
        title: raw.title,
        price_min: usd,
        price_max: usd,
        currency: 'USD',
        moq: 1,
        lead_time_days: null,
        image_url: raw.image_url,
        categories: null,
        keywords: raw.product_specs.length > 0 ? raw.product_specs : null,
        price_tiers: priceTiers as unknown as Json | null,
        shipping_options: null,
        is_customizable: raw.service_tags.some((t) =>
            t.toLowerCase().includes('custom'),
        ),
        data_source: '1688',
        raw_data: raw as unknown as Json,
        scraped_at: now,
        updated_at: now,
    }
}

export interface Fetch1688ProductsOptions {
    queries: string[]
    maxProductsPerQuery?: number
    sortType?: Scraper1688Input['sortType']
}

export interface Fetch1688ProductsResult {
    productsUpserted: number
    errors: string[]
}

/**
 * Fetch 1688 products for given queries, persist suppliers + products.
 */
export async function fetchAndPersist1688Products(
    supabase: SupabaseInstance,
    options: Fetch1688ProductsOptions,
): Promise<Fetch1688ProductsResult> {
    const errors: string[] = []
    let rawItems: Scraper1688Output[] = []

    try {
        rawItems = await runApifyActor<Scraper1688Input, Scraper1688Output>(
            APIFY_ACTOR_ID.scraper1688,
            {
                queries: options.queries,
                maxProducts: options.maxProductsPerQuery ?? 50,
                sortType: options.sortType ?? 'va_rmdarkgmv30',
                proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
            },
        )
    } catch (err) {
        errors.push(String(err))
        return { productsUpserted: 0, errors }
    }

    // Group items by shop so we make one supplier upsert per shop
    const byShop = new Map<string, Scraper1688Output[]>()
    for (const item of rawItems) {
        const key = `1688_${item.member_id}`
        if (!byShop.has(key)) byShop.set(key, [])
        byShop.get(key)!.push(item)
    }

    let totalUpserted = 0
    for (const [, items] of byShop.entries()) {
        const firstItem = items[0]!
        try {
            const supplier = await upsertSupplier(supabase, buildSupplierInsert(firstItem))
            const productInserts = items.map((item) =>
                normalise1688ProductInsert(item, supplier.id),
            )
            const upserted = await upsertSupplierProducts(supabase, productInserts)
            totalUpserted += upserted.length
        } catch (err) {
            errors.push(`Shop ${firstItem.shop_name}: ${String(err)}`)
        }
    }

    return { productsUpserted: totalUpserted, errors }
}
