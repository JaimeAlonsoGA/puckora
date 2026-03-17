/**
 * Supabase service layer — amazon_keywords + amazon_keyword_products tables.
 *
 * amazon_keywords         = one row per unique (keyword, marketplace) pair.
 *                           Canonical market data — not user-scoped. Upserted
 *                           on every search so the latest aggregates are kept.
 * amazon_keyword_products = pure junction: keyword_id × asin.
 *   No rank stored here — display ordering uses product_financials.rank (BSR).
 *   Both the extension scraper and SP-API background track write to this table;
 *   conflicts are silently ignored (ON CONFLICT DO NOTHING).
 *
 * All functions accept a typed Supabase instance so they work from both
 * Server Components (createServerClient) and Route Handlers (admin client).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

import type {
    AmazonKeyword,
    AmazonKeywordInsert,
    AmazonKeywordUpdate,
    AmazonKeywordProductInsert,
    ProductFinancial,
} from '@puckora/types'
import { getScrapeJob } from '@/services/scrape'

// ---------------------------------------------------------------------------
// amazon_keywords
// ---------------------------------------------------------------------------

/**
 * Upsert a keyword row by (keyword, marketplace).
 * Bumps last_searched_at and returns the canonical row.
 */
export async function upsertKeyword(
    supabase: SupabaseInstance,
    insert: AmazonKeywordInsert,
): Promise<AmazonKeyword> {
    const { data, error } = await supabase
        .from('amazon_keywords')
        .upsert(
            { ...insert, last_searched_at: new Date().toISOString() },
            { onConflict: 'keyword,marketplace', ignoreDuplicates: false },
        )
        .select('*')
        .single()

    if (error) throw new Error(`upsertKeyword failed: ${error.message}`)
    return data as AmazonKeyword
}

/**
 * Patch aggregate fields populated by the SP-API background track.
 * Only `total_results` and `unique_brands` are written here.
 */
export async function updateKeyword(
    supabase: SupabaseInstance,
    id: string,
    update: AmazonKeywordUpdate,
): Promise<void> {
    const { error } = await supabase
        .from('amazon_keywords')
        .update(update)
        .eq('id', id)

    if (error) throw new Error(`updateKeyword failed: ${error.message}`)
}

/**
 * Find the keyword row for a (keyword, marketplace) pair.
 * Returns null when this keyword has never been searched.
 */
export async function getKeyword(
    supabase: SupabaseInstance,
    keyword: string,
    marketplace: string,
): Promise<AmazonKeyword | null> {
    const { data, error } = await supabase
        .from('amazon_keywords')
        .select('*')
        .eq('keyword', keyword)
        .eq('marketplace', marketplace)
        .maybeSingle()

    if (error) throw new Error(`getKeyword failed: ${error.message}`)
    return data as AmazonKeyword | null
}

/**
 * Resolve the keyword row associated with a scrape job.
 * Looks up the job’s payload (keyword + marketplace) then delegates to getKeyword.
 * Returns null when the job has no keyword payload or no keyword row exists yet.
 */
export async function getKeywordForJob(
    supabase: SupabaseInstance,
    jobId: string,
): Promise<AmazonKeyword | null> {
    const job = await getScrapeJob(supabase, jobId)
    if (!job?.payload?.keyword || !job.payload.marketplace) return null
    return getKeyword(supabase, job.payload.keyword as string, job.payload.marketplace as string)
}

// ---------------------------------------------------------------------------
// amazon_keyword_products
// ---------------------------------------------------------------------------

/**
 * Link an ASIN to a keyword search. Idempotent — conflicts are silently ignored.
 */
export async function upsertKeywordProduct(
    supabase: SupabaseInstance,
    insert: AmazonKeywordProductInsert,
): Promise<void> {
    const { error } = await supabase
        .from('amazon_keyword_products')
        .upsert(insert, { onConflict: 'keyword_id,asin', ignoreDuplicates: true })

    if (error) throw new Error(`upsertKeywordProduct failed: ${error.message}`)
}

/**
 * Return ProductFinancial rows for all ASINs linked to a keyword search,
 * ordered by BSR (product_financials.rank ascending — lower = better).
 */
export async function getProductsForKeyword(
    supabase: SupabaseInstance,
    keywordId: string,
): Promise<ProductFinancial[]> {
    // Step 1: get all ASINs for this keyword
    const { data: links, error: linksError } = await supabase
        .from('amazon_keyword_products')
        .select('asin')
        .eq('keyword_id', keywordId)

    if (linksError) throw new Error(`getProductsForKeyword (links) failed: ${linksError.message}`)
    if (!links || links.length === 0) return []

    const asins = (links as { asin: string }[]).map((r) => r.asin)

    // Step 2: fetch product_financials, sorted by BSR
    const { data: products, error: productsError } = await supabase
        .from('product_financials')
        .select('*')
        .in('asin', asins)
        .order('rank', { ascending: true, nullsFirst: false })

    if (productsError) throw new Error(`getProductsForKeyword (financials) failed: ${productsError.message}`)
    return (products ?? []) as ProductFinancial[]
}
