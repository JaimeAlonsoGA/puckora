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

import { eq, and, inArray, notInArray, sql } from 'drizzle-orm'
import { type PgDb, amazonKeywords, amazonKeywordProducts, amazonProducts, productFinancialsView } from '@puckora/db'
import type {
    AmazonProduct,
    AmazonKeyword,
    AmazonKeywordInsert,
    AmazonKeywordUpdate,
    AmazonKeywordProductInsert,
    ProductFinancial,
} from '@puckora/types'
import { parseAmazonSearchJobPayload } from '@/schemas/scrape'
import { getScrapeJob } from '@/services/scrape'
import type { SupabaseDatabaseClient } from '@/integrations/supabase/types'

function getProductAgeMonths(listingDate: string | null): number | null {
    if (!listingDate) return null

    const date = new Date(listingDate)
    if (Number.isNaN(date.getTime())) return null

    const now = new Date()
    const months = (now.getUTCFullYear() - date.getUTCFullYear()) * 12
        + (now.getUTCMonth() - date.getUTCMonth())

    return Math.max(1, months)
}

export function mapAmazonProductToFinancial(product: AmazonProduct): ProductFinancial {
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
        bought_past_month: product.bought_past_month ?? null,
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
    supabase: SupabaseDatabaseClient,
    jobId: string,
): Promise<AmazonKeyword | null> {
    const job = await getScrapeJob(supabase, jobId)
    const payload = parseAmazonSearchJobPayload(job?.payload)
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
 * Remove ASIN links that are NOT in the current search's discovered set.
 * Called at the END of a keyword-search run instead of at the start, so
 * existing products stay visible to the user while the new search is in
 * progress. No-op when discoveredAsins covers all existing links.
 */
export async function deleteStaleKeywordProducts(
    db: PgDb,
    keywordId: string,
    discoveredAsins: string[],
): Promise<void> {
    if (discoveredAsins.length === 0) return
    await db
        .delete(amazonKeywordProducts)
        .where(
            and(
                eq(amazonKeywordProducts.keyword_id, keywordId),
                notInArray(amazonKeywordProducts.asin, discoveredAsins),
            ),
        )
}

/**
 * Return ProductFinancial rows for all ASINs linked to a keyword search,
 * ordered by BSR (product_financials.rank ascending — lower = better).
 *
 * 2-step query separates ASIN lookup from view access:
 *   1. Fast indexed scan on amazon_keyword_products.keyword_id → list of ASINs.
 *   2. product_financials queried with asin IN (list) — Postgres pushes the
 *      filter into the view's base table scan, avoiding full materialisation.
 *      Previously a single LEFT JOIN forced a 14-15 s full view sweep under
 *      write load; this approach reduces that to <500 ms.
 *   3. Fallback: ASINs absent from the view (no category ranks yet) are
 *      resolved from amazon_products and mapped to ProductFinancial shape.
 */
export async function getProductsForKeyword(
    db: PgDb,
    keywordId: string,
): Promise<ProductFinancial[]> {
    // Step 1: Get ASINs (fast — index scan on keyword_id PK)
    const asinRows = await db
        .select({ asin: amazonKeywordProducts.asin })
        .from(amazonKeywordProducts)
        .where(eq(amazonKeywordProducts.keyword_id, keywordId))

    if (asinRows.length === 0) return []

    const asins = asinRows.map((r) => r.asin).filter((a): a is string => a !== null)

    // Steps 2+3 in parallel: query the view AND pre-fetch amazon_products for
    // the same ASIN list simultaneously. View rows are preferred (they carry
    // financial data); amazon_products rows cover ASINs not yet in the view
    // (no category ranks = excluded from view's INNER JOIN). Parallelising the
    // two queries eliminates the sequential step-3 wait (~400 ms over WireGuard).
    const [viewRows, productRows] = await Promise.all([
        db
            .select({
                asin: productFinancialsView.asin,
                category_id: productFinancialsView.category_id,
                rank: productFinancialsView.rank,
                rank_type: productFinancialsView.rank_type,
                category_depth: productFinancialsView.category_depth,
                category_path: productFinancialsView.category_path,
                observed_at: productFinancialsView.observed_at,
                title: productFinancialsView.title,
                brand: productFinancialsView.brand,
                product_type: productFinancialsView.product_type,
                main_image_url: productFinancialsView.main_image_url,
                price: productFinancialsView.price,
                rating: productFinancialsView.rating,
                review_count: productFinancialsView.review_count,
                fba_fee: productFinancialsView.fba_fee,
                referral_fee: productFinancialsView.referral_fee,
                total_amazon_fees: productFinancialsView.total_amazon_fees,
                amazon_fee_pct: productFinancialsView.amazon_fee_pct,
                net_per_unit: productFinancialsView.net_per_unit,
                monthly_units_bsr: productFinancialsView.monthly_units_bsr,
                monthly_units_review: productFinancialsView.monthly_units_review,
                monthly_units: productFinancialsView.monthly_units,
                monthly_revenue: productFinancialsView.monthly_revenue,
                monthly_net: productFinancialsView.monthly_net,
                daily_velocity: productFinancialsView.daily_velocity,
                w_bsr: productFinancialsView.w_bsr,
                w_review: productFinancialsView.w_review,
                confidence: productFinancialsView.confidence,
                product_type_mismatch: productFinancialsView.product_type_mismatch,
                product_age_months: productFinancialsView.product_age_months,
                listing_date: productFinancialsView.listing_date,
                review_rate_per_month: productFinancialsView.review_rate_per_month,
                pkg_weight_kg: productFinancialsView.pkg_weight_kg,
                pkg_length_cm: productFinancialsView.pkg_length_cm,
                pkg_width_cm: productFinancialsView.pkg_width_cm,
                pkg_height_cm: productFinancialsView.pkg_height_cm,
            })
            .from(productFinancialsView)
            .where(inArray(productFinancialsView.asin, asins))
            .orderBy(sql`${productFinancialsView.rank} asc nulls last`),
        db.select().from(amazonProducts).where(inArray(amazonProducts.asin, asins)),
    ])

    // Deduplicate: view returns one row per BSR category per ASIN.
    // Keep the first (best-ranked) occurrence per ASIN.
    const dedupedFinancialRows = new Map<string, ProductFinancial>()
    for (const row of viewRows) {
        if (row.asin && !dedupedFinancialRows.has(row.asin)) {
            dedupedFinancialRows.set(row.asin, row as unknown as ProductFinancial)
        }
    }

    const financialRows = Array.from(dedupedFinancialRows.values())
    const fallbackAsins = asins.filter((a) => !dedupedFinancialRows.has(a))

    if (fallbackAsins.length === 0) return financialRows

    // Step 3: Use the pre-fetched amazon_products rows (already in productRows).
    // Filter to ASINs not covered by the view, map to ProductFinancial shape.
    const fallbackAsinSet = new Set(fallbackAsins)
    const fallbackRows = (productRows as AmazonProduct[]).filter((r) => fallbackAsinSet.has(r.asin))

    return [
        ...financialRows,
        ...fallbackRows.map(mapAmazonProductToFinancial),
    ]
}
