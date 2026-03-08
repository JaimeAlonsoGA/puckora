/**
 * POST /api/pulse/search
 *
 * Searches trending 1688 products for a given keyword.
 * Results are cached in Supabase for 24h keyed by keyword + marketplace.
 * Returns a normalised PulseItem array enriched with an opportunity score.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runApifyActor } from '@/lib/apify/client'
import { APIFY_ACTOR_ID } from '@/lib/apify/types'
import type { Scraper1688Input, Scraper1688Output, Scraper1688QuantityPrice } from '@/lib/apify/types'
import { upsertSupplier, upsertSupplierProducts } from '@/lib/services/suppliers'
import { logSearchHistory } from '@/lib/services/market'
import type { SupplierInsert, SupplierProductInsert } from '@puckora/types'
import type { PulseItem, PulseSearchResponse } from '@/lib/pulse/types'

// Allow up to 60s for this route (scraper can take a while)
export const maxDuration = 60

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const SearchSchema = z.object({
    keyword: z.string().min(1).max(100).trim(),
    marketplace: z.string().default('US'),
    maxProducts: z.number().int().min(10).max(200).default(50),
})

// ---------------------------------------------------------------------------
// Province → English map
// ---------------------------------------------------------------------------

const PROVINCE_MAP: Record<string, string> = {
    广东: 'Guangdong',
    浙江: 'Zhejiang',
    福建: 'Fujian',
    上海: 'Shanghai',
    江苏: 'Jiangsu',
    山东: 'Shandong',
    北京: 'Beijing',
    天津: 'Tianjin',
    河南: 'Henan',
    湖南: 'Hunan',
    湖北: 'Hubei',
    安徽: 'Anhui',
    河北: 'Hebei',
    陕西: 'Shaanxi',
    四川: 'Sichuan',
    重庆: 'Chongqing',
    辽宁: 'Liaoning',
    吉林: 'Jilin',
    黑龙江: 'Heilongjiang',
    广西: 'Guangxi',
    江西: 'Jiangxi',
    云南: 'Yunnan',
    贵州: 'Guizhou',
}

function translateProvince(chinese: string): string {
    return PROVINCE_MAP[chinese] ?? chinese
}

function buildLocation(raw: Scraper1688Output): string {
    const province = translateProvince(raw.province)
    // city is in Chinese, skip for now and just show province + China
    return province ? `${province}, China` : 'China'
}

// ---------------------------------------------------------------------------
// Opportunity score (0–100)
// ---------------------------------------------------------------------------

function parseOrderCount(raw: string): number {
    const n = parseInt(raw.replace(/[^0-9]/g, ''), 10)
    return isNaN(n) ? 0 : n
}

function parseRepurchaseRate(raw: string): number {
    const n = parseFloat(raw.replace('%', ''))
    return isNaN(n) ? 0 : n
}

function parseUsdPrice(raw: Scraper1688Output): number | null {
    // price string = "28.50 ($3.99)" — extract USD value
    const match = raw.price.match(/\$\s*([\d.]+)/)
    if (match) return parseFloat(match[1])
    // Fallback: price_integer + price_decimal in CNY → rough 7:1 conversion
    const cnyStr = `${raw.price_integer}.${raw.price_decimal}`
    const cny = parseFloat(cnyStr)
    return isNaN(cny) ? null : Math.round((cny / 7.1) * 100) / 100
}

const CERTIFIED_FACTORY_BADGE = '认证工厂'

function computeOpportunityScore(raw: Scraper1688Output, priceUsd: number | null): number {
    let score = 0

    // Order count: max 40 pts
    const orders = parseOrderCount(raw.order_count)
    if (orders >= 2000) score += 40
    else if (orders >= 500) score += 30
    else if (orders >= 100) score += 20
    else if (orders >= 20) score += 10

    // Repurchase rate: max 30 pts
    const repurchase = parseRepurchaseRate(raw.repurchase_rate)
    if (repurchase >= 20) score += 30
    else if (repurchase >= 10) score += 20
    else if (repurchase >= 5) score += 10

    // Certified factory: +15
    if (raw.product_badges?.includes(CERTIFIED_FACTORY_BADGE)) score += 15

    // Margin potential (USD < $10 and > $1): +10
    if (priceUsd !== null && priceUsd > 1 && priceUsd < 10) score += 10

    // Bulk pricing available (tiered): +5
    if (raw.quantity_prices && raw.quantity_prices.length > 1) score += 5

    return Math.min(100, score)
}

// ---------------------------------------------------------------------------
// DB upsert helpers
// ---------------------------------------------------------------------------

function buildSupplierInsert(raw: Scraper1688Output): SupplierInsert {
    const now = new Date().toISOString()
    return {
        alibaba_id: `1688_${raw.member_id}`,
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

function buildSupplierProductInsert(
    raw: Scraper1688Output,
    supplierId: string,
    keyword: string,
): SupplierProductInsert {
    const now = new Date().toISOString()
    const usd = parseUsdPrice(raw)
    const priceTiers =
        raw.quantity_prices && raw.quantity_prices.length > 0
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
        keywords: raw.product_specs && raw.product_specs.length > 0 ? raw.product_specs : null,
        price_tiers: priceTiers as unknown as import('@puckora/types').Json | null,
        shipping_options: null,
        is_customizable: raw.service_tags?.some((t) => t.toLowerCase().includes('custom')) ?? false,
        data_source: '1688' as const,
        // Embed the search keyword in raw_data for cache keying
        raw_data: { ...(raw as unknown as Record<string, unknown>), _search_query: keyword },
        scraped_at: now,
        updated_at: now,
    }
}

// ---------------------------------------------------------------------------
// Row → PulseItem mapper
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPulseItem(row: any): PulseItem | null {
    const raw = row.raw_data as (Scraper1688Output & { _search_query?: string }) | null
    if (!raw) return null

    const priceUsd = parseUsdPrice(raw)
    return {
        id: row.id as string,
        supplierId: row.supplier_id as string,
        alibabaProductId: (row.alibaba_product_id as string) ?? '',
        title: (row.title as string) ?? '',
        imageUrl: (row.image_url as string | null) ?? null,
        priceUsd,
        priceRaw: raw.price ?? '',
        moq: row.moq ?? 1,
        orderCount: parseOrderCount(raw.order_count ?? '0'),
        repurchaseRate: parseRepurchaseRate(raw.repurchase_rate ?? '0'),
        detailUrl: raw.detail_url ?? '',
        shopName: raw.shop_name ?? (row.suppliers?.name ?? ''),
        location: buildLocation(raw),
        quantityPrices: raw.quantity_prices ?? [],
        serviceTags: raw.service_tags ?? [],
        productBadges: raw.product_badges ?? [],
        productSpecs: (raw.product_specs ?? []).slice(0, 5),
        opportunityScore: computeOpportunityScore(raw, priceUsd),
        isCertifiedFactory: (raw.product_badges ?? []).includes(CERTIFIED_FACTORY_BADGE),
        supplierIsVerified: (row.suppliers?.is_verified as boolean | null) ?? null,
    }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const supabase = await createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const parsed = SearchSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 },
            )
        }
        const { keyword, marketplace, maxProducts } = parsed.data

        // ---------------------------------------------------------------
        // Cache check: supplier_products from last 24h for this keyword
        // ---------------------------------------------------------------
        const cacheWindow = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data: cached } = await supabase
            .from('supplier_products')
            .select('*, suppliers(id, name, country, is_verified, is_gold_supplier)')
            .eq('data_source', '1688')
            .gte('scraped_at', cacheWindow)
            .filter('raw_data->>_search_query', 'eq', keyword)
            .order('created_at', { ascending: false })
            .limit(maxProducts)

        if (cached && cached.length >= 3) {
            const items = cached.map(rowToPulseItem).filter((i): i is PulseItem => i !== null)
            items.sort((a, b) => b.opportunityScore - a.opportunityScore)
            const response: PulseSearchResponse = { items, cached: true, keyword }
            return NextResponse.json(response)
        }

        // ---------------------------------------------------------------
        // Scrape 1688
        // ---------------------------------------------------------------
        const rawProducts = await runApifyActor<Scraper1688Input, Scraper1688Output>(
            APIFY_ACTOR_ID.scraper1688,
            {
                queries: [keyword],
                maxProducts,
                sortType: 'va_rmdarkgmv30', // best-selling first
                proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
            },
        )

        // Filter out blank placeholder rows the actor sometimes emits
        const validProducts = rawProducts.filter((p) => !!p.offer_id && !!p.member_id)

        if (validProducts.length === 0) {
            const empty: PulseSearchResponse = { items: [], cached: false, keyword }
            return NextResponse.json(empty)
        }

        // ---------------------------------------------------------------
        // Group by shop and upsert suppliers + products
        // Use admin client to bypass RLS — suppliers is shared/non-user data
        // ---------------------------------------------------------------
        const adminSupabase = createAdminClient()
        const byShop = new Map<string, Scraper1688Output[]>()
        for (const item of validProducts) {
            const key = `1688_${item.member_id}`
            if (!byShop.has(key)) byShop.set(key, [])
            byShop.get(key)!.push(item)
        }

        const supplierProductIds: string[] = []

        for (const [shopKey, items] of byShop.entries()) {
            const firstItem = items[0]!
            try {
                const supplier = await upsertSupplier(adminSupabase, buildSupplierInsert(firstItem))
                const productInserts = items.map((item) =>
                    buildSupplierProductInsert(item, supplier.id, keyword),
                )
                const upserted = await upsertSupplierProducts(adminSupabase, productInserts)
                supplierProductIds.push(...upserted.map((p) => p.id))
            } catch (shopErr) {
                console.error(`[pulse/search] Failed to upsert shop ${shopKey}:`, shopErr)
            }
        }

        // Log search history (non-blocking)
        logSearchHistory(
            supabase,
            user.id,
            keyword,
            marketplace as Parameters<typeof logSearchHistory>[3],
            'keyword',
            rawProducts.length,
        ).catch(() => { })

        // ---------------------------------------------------------------
        // Fetch the just-upserted records with supplier join and return
        // ---------------------------------------------------------------
        const { data: fresh } = await adminSupabase
            .from('supplier_products')
            .select('*, suppliers(id, name, country, is_verified, is_gold_supplier)')
            .in('id', supplierProductIds)
            .limit(maxProducts)

        const items = (fresh ?? [])
            .map(rowToPulseItem)
            .filter((i): i is PulseItem => i !== null)
        items.sort((a, b) => b.opportunityScore - a.opportunityScore)

        const result: PulseSearchResponse = { items, cached: false, keyword }
        return NextResponse.json(result)
    } catch (err) {
        console.error('[pulse/search] Unhandled error:', err)
        const message = err instanceof Error ? err.message : 'Internal server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
