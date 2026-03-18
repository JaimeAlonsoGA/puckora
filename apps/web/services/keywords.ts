/**
 * Drizzle service layer — amazon_keywords + amazon_keyword_products (Fly.io Postgres).
 *
 * amazon_keywords         = one row per unique (keyword, marketplace) pair.
 *                           Canonical market data — not user-scoped. Upserted
 *                           on every search so the latest aggregates are kept.
 * amazon_keyword_products = pure junction: keyword_id × asin.
 *   No rank stored here — display ordering uses product_financials.rank (BSR).
 *   Both the extension scraper and SP-API background track write to this table;
 *   conflicts are silently ignored (ON CONFLICT DO NOTHING).
 *
 * NOTE: getKeywordForJob requires both a PgDb (keywords on Fly.io) and a
 * Supabase instance (scrape_jobs stays on Supabase). Callers must provide both.
 */

import { eq, and, inArray, sql } from 'drizzle-orm'
import { type PgDb, amazonKeywords, amazonKeywordProducts, amazonProducts, productFinancialsView } from '@puckora/db'
import type {
    AmazonProduct,
    AmazonKeyword,
    AmazonKeywordInsert,
    AmazonKeywordUpdate,
    AmazonKeywordProductInsert,
    ProductFinancial,
} from '@puckora/types'
import { getScrapeJob } from '@/services/scrape'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

function getProductAgeMonths(listingDate: string | null): number | null {
    if (!listingDate) return null

    const date = new Date(listingDate)
    if (Number.isNaN(date.getTime())) return null

    const now = new Date()
    const months = (now.getUTCFullYear() - date.getUTCFullYear()) * 12
        + (now.getUTCMonth() - date.getUTCMonth())

    return Math.max(1, months)
}

function mapAmazonProductToFinancial(product: AmazonProduct): ProductFinancial {
    return {
        asin: product.asin,
        category_id: null,
        rank: null,
        rank_type: null,
        category_depth: null,
        category_path: null,
        observed_at: product.updated_at,
        title: product.title,
        brand: product.brand,
        product_type: product.product_type,
        main_image_url: product.main_image_url,
        price: product.price,
        rating: product.rating,
        review_count: product.review_count,
        fba_fee: product.fba_fee,
        referral_fee: product.referral_fee,
        total_amazon_fees: product.fba_fee != null && product.referral_fee != null
            ? Number((product.fba_fee + product.referral_fee).toFixed(2))
            : null,
        amazon_fee_pct: product.price != null && product.price > 0 && product.fba_fee != null && product.referral_fee != null
            ? Number((((product.fba_fee + product.referral_fee) / product.price) * 100).toFixed(1))
            : null,
        net_per_unit: product.price != null && product.fba_fee != null && product.referral_fee != null
            ? Number((product.price - product.fba_fee - product.referral_fee).toFixed(2))
            : null,
        monthly_units_bsr: null,
        monthly_units_review: null,
        monthly_units: null,
        monthly_revenue: null,
        monthly_net: null,
        daily_velocity: null,
        w_bsr: null,
        w_review: null,
        confidence: product.fba_fee != null || product.referral_fee != null || (product.review_count ?? 0) >= 20 ? 'medium' : 'low',
        product_type_mismatch: false,
        product_age_months: getProductAgeMonths(product.listing_date),
        listing_date: product.listing_date,
        review_rate_per_month: null,
        pkg_weight_kg: product.pkg_weight_kg,
        pkg_length_cm: product.pkg_length_cm,
        pkg_width_cm: product.pkg_width_cm,
        pkg_height_cm: product.pkg_height_cm,
    }
}

// ---------------------------------------------------------------------------
// amazon_keywords
// ---------------------------------------------------------------------------

/**
 * Upsert a keyword row by (keyword, marketplace).
 * Bumps last_searched_at and returns the canonical row.
 */
export async function upsertKeyword(
    db: PgDb,
    insert: AmazonKeywordInsert,
): Promise<AmazonKeyword> {
    const rows = await db
        .insert(amazonKeywords)
        .values({
            ...insert,
            last_searched_at: new Date().toISOString(),
        } as typeof amazonKeywords.$inferInsert)
        .onConflictDoUpdate({
            target: [amazonKeywords.keyword, amazonKeywords.marketplace],
            set: {
                total_results: sql`excluded.total_results`,
                unique_brands: sql`excluded.unique_brands`,
                last_searched_at: sql`excluded.last_searched_at`,
            },
        })
        .returning()
    return rows[0] as AmazonKeyword
}

/**
 * Patch aggregate fields populated by the SP-API background track.
 * Only `total_results` and `unique_brands` are written here.
 */
export async function updateKeyword(
    db: PgDb,
    id: string,
    update: AmazonKeywordUpdate,
): Promise<void> {
    await db
        .update(amazonKeywords)
        .set(update as Partial<typeof amazonKeywords.$inferInsert>)
        .where(eq(amazonKeywords.id, id))
}

/**
 * Find the keyword row for a (keyword, marketplace) pair.
 * Returns null when this keyword has never been searched.
 */
export async function getKeyword(
    db: PgDb,
    keyword: string,
    marketplace: string,
): Promise<AmazonKeyword | null> {
    const rows = await db
        .select()
        .from(amazonKeywords)
        .where(and(eq(amazonKeywords.keyword, keyword), eq(amazonKeywords.marketplace, marketplace)))
        .limit(1)
    return (rows[0] ?? null) as AmazonKeyword | null
}

/**
 * Resolve the keyword row associated with a scrape job.
 * Looks up the job’s payload (keyword + marketplace) then delegates to getKeyword.
 * Returns null when the job has no keyword payload or no keyword row exists yet.
 */
/**
 * scrape_jobs stays on Supabase — pass `supabase` for that lookup.
 * amazon_keywords lives on Fly.io — `db` is used for the keyword fetch.
 */
export async function getKeywordForJob(
    db: PgDb,
    supabase: SupabaseInstance,
    jobId: string,
): Promise<AmazonKeyword | null> {
    const job = await getScrapeJob(supabase, jobId)
    const payload = job?.payload as { keyword?: string; marketplace?: string } | undefined
    if (!payload?.keyword || !payload?.marketplace) return null
    return getKeyword(db, payload.keyword, payload.marketplace)
}

// ---------------------------------------------------------------------------
// amazon_keyword_products
// ---------------------------------------------------------------------------

/**
 * Link an ASIN to a keyword search. Idempotent — conflicts are silently ignored.
 */
export async function upsertKeywordProduct(
    db: PgDb,
    insert: AmazonKeywordProductInsert,
): Promise<void> {
    await db
        .insert(amazonKeywordProducts)
        .values(insert as typeof amazonKeywordProducts.$inferInsert)
        .onConflictDoNothing()
}

/**
 * Remove all current ASIN links for a keyword.
 * Used when a fresh keyword search should replace the visible result set
 * instead of accumulating stale ASINs from older runs.
 */
export async function clearKeywordProducts(
    db: PgDb,
    keywordId: string,
): Promise<void> {
    await db
        .delete(amazonKeywordProducts)
        .where(eq(amazonKeywordProducts.keyword_id, keywordId))
}

/**
 * Return ProductFinancial rows for all ASINs linked to a keyword search,
 * ordered by BSR (product_financials.rank ascending — lower = better).
 */
export async function getProductsForKeyword(
    db: PgDb,
    keywordId: string,
): Promise<ProductFinancial[]> {
    // Step 1: get all ASINs for this keyword
    const links = await db
        .select({ asin: amazonKeywordProducts.asin })
        .from(amazonKeywordProducts)
        .where(eq(amazonKeywordProducts.keyword_id, keywordId))

    if (links.length === 0) return []

    const asins = links.map((r) => r.asin)

    // Step 2: fetch product_financials view, sorted by BSR (nulls last)
    const rows = await db
        .select()
        .from(productFinancialsView)
        .where(inArray(productFinancialsView.asin!, asins))
        .orderBy(sql`${productFinancialsView.rank} asc nulls last`)

    const dedupedFinancialRows = new Map<string, ProductFinancial>()
    for (const row of rows as ProductFinancial[]) {
        if (!row.asin) continue
        if (!dedupedFinancialRows.has(row.asin)) {
            dedupedFinancialRows.set(row.asin, row)
        }
    }

    const financialRows = Array.from(dedupedFinancialRows.values())
    const financialAsins = new Set(financialRows.map((row) => row.asin).filter((asin): asin is string => Boolean(asin)))
    const fallbackAsins = asins.filter((asin) => !financialAsins.has(asin))

    if (fallbackAsins.length === 0) return financialRows

    const fallbackRows = await db
        .select()
        .from(amazonProducts)
        .where(inArray(amazonProducts.asin, fallbackAsins))

    const fallbackMap = new Map(
        (fallbackRows as AmazonProduct[]).map((product) => [product.asin, product] as const),
    )

    const fallbackProducts = fallbackAsins
        .map((asin) => fallbackMap.get(asin))
        .filter((product): product is AmazonProduct => product != null)
        .map(mapAmazonProductToFinancial)

    return [...financialRows, ...fallbackProducts]
}
