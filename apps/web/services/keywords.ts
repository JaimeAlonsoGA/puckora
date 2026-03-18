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
import { type PgDb, amazonKeywords, amazonKeywordProducts, productFinancialsView } from '@puckora/db'
import type {
    AmazonKeyword,
    AmazonKeywordInsert,
    AmazonKeywordUpdate,
    AmazonKeywordProductInsert,
    ProductFinancial,
} from '@puckora/types'
import { getScrapeJob } from '@/services/scrape'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

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
    return rows as ProductFinancial[]
}
