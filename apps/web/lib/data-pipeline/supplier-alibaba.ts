import type { Json } from '@puckora/types'
/**
 * Data pipeline: Alibaba suppliers.
 *
 * Fetches supplier data from two Apify actors:
 *   - devcake/alibaba-supplier-scraper   (structured, has factory details)
 *   - shareze001/scrape-alibaba-suppliers-and-detail (richer data, cert support)
 *
 * Normalises and upserts into the Supabase `suppliers` table.
 */

import { runApifyActor } from '@/lib/apify/client'
import { APIFY_ACTOR_ID } from '@/lib/apify/types'
import type {
    AlibabaSupplierScraperInput,
    AlibabaSupplierScraperOutput,
    AlibabaSupplierDetailInput,
    AlibabaSupplierDetailOutput,
} from '@/lib/apify/types'
import { upsertSuppliers } from '@/lib/services/suppliers'
import type { SupplierInsert } from '@puckora/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

// ---------------------------------------------------------------------------
// Normalise devcake/alibaba-supplier-scraper → SupplierInsert
// ---------------------------------------------------------------------------

function parseRevenue(revenueStr: string | null | undefined): number | null {
    if (!revenueStr) return null
    const match = revenueStr.match(/[\d,]+/)
    if (!match) return null
    return parseInt(match[0].replace(/,/g, ''), 10)
}

function parseEmployees(empStr: string | null | undefined): number | null {
    if (!empStr) return null
    const match = empStr.match(/\d+/)
    return match ? parseInt(match[0], 10) : null
}

function normaliseDevcakeSupplier(raw: AlibabaSupplierScraperOutput): SupplierInsert {
    const now = new Date().toISOString()
    return {
        alibaba_id: String(raw.company_id),
        name: raw.name,
        country: raw.country,
        url: raw.profile_url,
        is_gold_supplier: raw.years_as_gold_supplier > 0,
        is_verified: raw.is_verified_supplier_pro,
        is_trade_assurance: false,
        years_on_platform: raw.years_as_gold_supplier,
        avg_rating: raw.review_score,
        total_reviews: raw.review_count,
        response_rate_pct: raw.response_rate ? parseFloat(raw.response_rate) : null,
        response_time_hours: null,
        employees_count: parseEmployees(raw.total_employees),
        annual_revenue_usd: parseRevenue(raw.annual_revenue),
        main_products: raw.products_offered ? [raw.products_offered] : null,
        main_categories: null,
        certifications: null,
        trade_assurance: false,
        raw_data: raw as unknown as Json,
        scraped_at: now,
        needs_refresh_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: now,
    }
}

// ---------------------------------------------------------------------------
// Normalise shareze001/scrape-alibaba-suppliers-and-detail → SupplierInsert
// ---------------------------------------------------------------------------

function normaliseSharezeSupplier(raw: AlibabaSupplierDetailOutput): SupplierInsert {
    const now = new Date().toISOString()
    return {
        alibaba_id: raw.companyId,
        name: raw.companyName,
        country: raw.area,
        url: raw.url,
        is_gold_supplier: raw.goldYears > 0,
        is_verified: raw.isAssessedSupplier,
        is_trade_assurance: false,
        years_on_platform: raw.goldYears,
        avg_rating: raw.reviewScore,
        total_reviews: raw.reviewCount,
        response_rate_pct: null,
        response_time_hours: raw.replyAvgTime ? parseInt(raw.replyAvgTime) : null,
        employees_count: raw.staff ? parseInt(raw.staff) : null,
        annual_revenue_usd: null,
        main_products: raw.productList?.map((p) => p.subject) ?? null,
        main_categories: raw.capabilities ?? null,
        certifications: raw.certificates?.map((c) => c.certType) ?? null,
        trade_assurance: false,
        raw_data: raw as unknown as Json,
        scraped_at: now,
        needs_refresh_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: now,
    }
}

// ---------------------------------------------------------------------------
// Public pipeline functions
// ---------------------------------------------------------------------------

export interface FetchAlibabaSupplierOptions {
    queries: string[]
    maxPagesPerQuery?: number
}

export interface FetchAlibabaSupplierResult {
    suppliersUpserted: number
    errors: string[]
}

/**
 * Fetch supplier list via devcake/alibaba-supplier-scraper.
 */
export async function fetchAndPersistAlibabaSuppliers(
    supabase: SupabaseInstance,
    options: FetchAlibabaSupplierOptions,
): Promise<FetchAlibabaSupplierResult> {
    let rawItems: AlibabaSupplierScraperOutput[] = []
    const errors: string[] = []

    try {
        rawItems = await runApifyActor<AlibabaSupplierScraperInput, AlibabaSupplierScraperOutput>(
            APIFY_ACTOR_ID.alibabaSupplierScraper,
            { queries: options.queries, max_pages: options.maxPagesPerQuery ?? 1 },
        )
    } catch (err) {
        errors.push(String(err))
        return { suppliersUpserted: 0, errors }
    }

    const inserts = rawItems.map(normaliseDevcakeSupplier)

    try {
        const upserted = await upsertSuppliers(supabase, inserts)
        return { suppliersUpserted: upserted.length, errors }
    } catch (err) {
        errors.push(String(err))
        return { suppliersUpserted: 0, errors }
    }
}

/**
 * Fetch supplier details (incl. optional certificates) via
 * shareze001/scrape-alibaba-suppliers-and-detail.
 */
export async function fetchAndPersistAlibabaSupplierDetails(
    supabase: SupabaseInstance,
    options: {
        keyword?: string
        size?: number
        scrapeDetail?: boolean
        supplierUrls?: string[]
    },
): Promise<FetchAlibabaSupplierResult> {
    let rawItems: AlibabaSupplierDetailOutput[] = []
    const errors: string[] = []

    try {
        rawItems = await runApifyActor<AlibabaSupplierDetailInput, AlibabaSupplierDetailOutput>(
            APIFY_ACTOR_ID.alibabaSupplierDetail,
            {
                size: options.size ?? 10,
                keyword: options.keyword,
                scrape_detail: options.scrapeDetail ?? false,
                supplier_urls: options.supplierUrls?.map((url) => ({ url })),
            },
        )
    } catch (err) {
        errors.push(String(err))
        return { suppliersUpserted: 0, errors }
    }

    const inserts = rawItems.map(normaliseSharezeSupplier)

    try {
        const upserted = await upsertSuppliers(supabase, inserts)
        return { suppliersUpserted: upserted.length, errors }
    } catch (err) {
        errors.push(String(err))
        return { suppliersUpserted: 0, errors }
    }
}
