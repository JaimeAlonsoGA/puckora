/**
 * Drizzle service layer — amazon_keywords + amazon_keyword_products (Fly.io Postgres).
 *
 * amazon_keywords         = one row per unique (keyword, marketplace) pair.
 *                           Canonical market data — not user-scoped. Upserted
 *                           on every search so the latest aggregates are kept.
 * amazon_keyword_products = pure junction: keyword_id × asin.
 *   No rank stored here — display ordering uses ProductFinancial.rank from the
 *   per-request BSR lookup in getProductsForKeyword().
 *   Both the extension scraper and SP-API background track write to this table;
 *   conflicts are silently ignored (ON CONFLICT DO NOTHING).
 *
 * NOTE: getKeywordForJob requires both a PgDb (keywords on Fly.io) and a
 * Supabase instance (scrape_jobs stays on Supabase). Callers must provide both.
 */

import { eq, and, asc, inArray, isNull, notInArray, or, sql } from 'drizzle-orm'
import {
    type PgDb,
    amazonCategories,
    amazonKeywords,
    amazonKeywordProducts,
    amazonProducts,
    productCategoryRanks,
} from '@puckora/db'
import type {
    AmazonProduct,
    AmazonKeyword,
    AmazonKeywordInsert,
    AmazonKeywordUpdate,
    AmazonKeywordProductInsert,
    ProductFinancial,
} from '@puckora/types'
import { SEARCH_RESULT_REPAIR_FIELDS } from '@/constants/search'
import { SERVICE_ERROR_PREFIXES } from '@/constants/api'
import { parseAmazonSearchJobPayload } from '@/schemas/scrape'
import { getScrapeJob } from '@/services/scrape'
import type { SupabaseDatabaseClient } from '@/integrations/supabase/types'
import { buildProductFinancial, type BsrRow } from '@/lib/financials'

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
 * scrape_jobs stays on Supabase — pass `supabase` for that lookup.
 * amazon_keywords lives on Fly.io — `db` is used for the keyword fetch.
 * Returns null when the job has no keyword payload or no keyword row exists yet.
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
 * Return linked amazon_products rows whose current DB state still looks
 * incomplete for the search UI and should be retried via SP-API enrichment.
 */
export async function listKeywordProductsNeedingRepair(
    db: PgDb,
    keywordId: string,
    limit: number,
): Promise<AmazonProduct[]> {
    try {
        const rows = await db
            .select({
                asin: amazonProducts.asin,
                title: amazonProducts.title,
                brand: amazonProducts.brand,
                manufacturer: amazonProducts.manufacturer,
                price: amazonProducts.price,
                rating: amazonProducts.rating,
                review_count: amazonProducts.review_count,
                main_image_url: amazonProducts.main_image_url,
                product_url: amazonProducts.product_url,
                product_type: amazonProducts.product_type,
                color: amazonProducts.color,
                model_number: amazonProducts.model_number,
                package_quantity: amazonProducts.package_quantity,
                bullet_points: amazonProducts.bullet_points,
                browse_node_id: amazonProducts.browse_node_id,
                listing_date: amazonProducts.listing_date,
                item_length_cm: amazonProducts.item_length_cm,
                item_width_cm: amazonProducts.item_width_cm,
                item_height_cm: amazonProducts.item_height_cm,
                item_weight_kg: amazonProducts.item_weight_kg,
                pkg_length_cm: amazonProducts.pkg_length_cm,
                pkg_width_cm: amazonProducts.pkg_width_cm,
                pkg_height_cm: amazonProducts.pkg_height_cm,
                pkg_weight_kg: amazonProducts.pkg_weight_kg,
                parent_asin: amazonProducts.parent_asin,
                bought_past_month: amazonProducts.bought_past_month,
                fba_fee: amazonProducts.fba_fee,
                referral_fee: amazonProducts.referral_fee,
                embedding: amazonProducts.embedding,
                scrape_status: amazonProducts.scrape_status,
                enriched_at: amazonProducts.enriched_at,
                created_at: amazonProducts.created_at,
                updated_at: amazonProducts.updated_at,
            })
            .from(amazonKeywordProducts)
            .innerJoin(amazonProducts, eq(amazonKeywordProducts.asin, amazonProducts.asin))
            .where(
                and(
                    eq(amazonKeywordProducts.keyword_id, keywordId),
                    or(
                        eq(amazonProducts.scrape_status, 'scraped'),
                        eq(amazonProducts.scrape_status, 'enrichment_failed'),
                        isNull(amazonProducts.enriched_at),
                        ...SEARCH_RESULT_REPAIR_FIELDS.map((field) => isNull(amazonProducts[field])),
                    ),
                ),
            )
            .orderBy(asc(amazonProducts.updated_at))
            .limit(limit)

        return rows as AmazonProduct[]
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        throw new Error(`${SERVICE_ERROR_PREFIXES.LIST_KEYWORD_PRODUCTS_NEEDING_REPAIR_FAILED}: ${message}`)
    }
}

/**
 * Return ProductFinancial rows for all ASINs linked to a keyword search,
 * ordered by BSR (rank ascending — lower = better, unranked products last).
 *
 * 2-query + TypeScript approach:
 *   1. ASIN list from amazon_keyword_products (index scan, instant).
 *   2. In parallel: product PK lookup + BSR rank lookup per ASIN.
 *   TypeScript: buildProductFinancial() for each product, sort by rank.
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

    // Steps 2+3 in parallel: PK-lookup products + best BSR rank per ASIN (for rank/category display).
    const [productRows, bsrRows] = await Promise.all([
        db.select().from(amazonProducts).where(inArray(amazonProducts.asin, asins)),
        db
            .select({
                asin: productCategoryRanks.asin,
                category_id: productCategoryRanks.category_id,
                rank: productCategoryRanks.rank,
                rank_type: productCategoryRanks.rank_type,
                observed_at: productCategoryRanks.observed_at,
                category_depth: amazonCategories.depth,
                category_path: amazonCategories.full_path,
            })
            .from(productCategoryRanks)
            .innerJoin(amazonCategories, eq(amazonCategories.id, productCategoryRanks.category_id))
            .where(and(
                inArray(productCategoryRanks.asin, asins),
                eq(productCategoryRanks.rank_type, 'best_seller'),
            ))
            .orderBy(asc(productCategoryRanks.asin), asc(productCategoryRanks.rank)),
    ])

    const bsrByAsin = new Map<string, BsrRow>()
    for (const row of bsrRows as Array<BsrRow & { asin: string }>) {
        if (!bsrByAsin.has(row.asin)) {
            bsrByAsin.set(row.asin, row)
        }
    }

    const results = (productRows as AmazonProduct[]).map((product) => {
        const bsr = bsrByAsin.get(product.asin) ?? null
        return buildProductFinancial(product, bsr)
    })

    // Sort by rank ascending (unranked products go last).
    results.sort((a, b) => {
        if (a.rank == null && b.rank == null) return 0
        if (a.rank == null) return 1
        if (b.rank == null) return -1
        return a.rank - b.rank
    })

    return results
}
