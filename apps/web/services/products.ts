/**
 * Drizzle service layer — Amazon products & category ranks (Fly.io Postgres).
 *
 * All functions accept a PgDb instance so they work from Server Components,
 * Route Handlers, and background jobs with a shared singleton.
 */

import { and, eq, gte, inArray, isNull, isNotNull, lte, notExists, or, asc, desc, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import {
    type PgDb,
    amazonCategories,
    amazonKeywordProducts,
    amazonProducts,
    productCategoryRanks,
} from '@puckora/db'
import type {
    AmazonProduct,
    AmazonProductInsert,
    AmazonProductUpdate,
    ProductCategoryRank,
    ProductCategoryRankInsert,
    ProductFinancial,
} from '@puckora/types'
import { SERVICE_ERROR_PREFIXES } from '@/constants/api'
import { AMAZON_CATEGORIES } from '@/constants/amazon-categories'
import type { DiscoverFilters } from '@/schemas/discover'
import { buildProductFinancial, type BsrRow } from '@/lib/financials'

type AmazonProductColumnName = keyof typeof amazonProducts['_']['columns']

function quoteIdentifier(identifier: string) {
    return `"${identifier.replace(/"/g, '""')}"`
}

function tableColumn(name: AmazonProductColumnName) {
    return `${quoteIdentifier('amazon_products')}.${quoteIdentifier(name)}`
}

function excludedColumn(name: AmazonProductColumnName) {
    return `excluded.${quoteIdentifier(name)}`
}

function preferExcludedValue(name: AmazonProductColumnName) {
    return sql.raw(`coalesce(${excludedColumn(name)}, ${tableColumn(name)})`)
}

function preferExcludedArray(name: AmazonProductColumnName) {
    return sql.raw(`
        case
            when ${excludedColumn(name)} is not null
                and coalesce(array_length(${excludedColumn(name)}, 1), 0) > 0
            then ${excludedColumn(name)}
            else ${tableColumn(name)}
        end
    `)
}

function mergeScrapeStatus() {
    return sql.raw(`
        case
            when ${excludedColumn('scrape_status')} in ('enriched', 'enrichment_failed') then ${excludedColumn('scrape_status')}
            else ${tableColumn('scrape_status')}
        end
    `)
}

function buildAmazonProductMergeSet() {
    return {
        title: preferExcludedValue('title'),
        brand: preferExcludedValue('brand'),
        manufacturer: preferExcludedValue('manufacturer'),
        price: preferExcludedValue('price'),
        rating: preferExcludedValue('rating'),
        review_count: preferExcludedValue('review_count'),
        main_image_url: preferExcludedValue('main_image_url'),
        product_url: preferExcludedValue('product_url'),
        product_type: preferExcludedValue('product_type'),
        color: preferExcludedValue('color'),
        model_number: preferExcludedValue('model_number'),
        package_quantity: preferExcludedValue('package_quantity'),
        bullet_points: preferExcludedArray('bullet_points'),
        browse_node_id: preferExcludedValue('browse_node_id'),
        listing_date: preferExcludedValue('listing_date'),
        item_length_cm: preferExcludedValue('item_length_cm'),
        item_width_cm: preferExcludedValue('item_width_cm'),
        item_height_cm: preferExcludedValue('item_height_cm'),
        item_weight_kg: preferExcludedValue('item_weight_kg'),
        pkg_length_cm: preferExcludedValue('pkg_length_cm'),
        pkg_width_cm: preferExcludedValue('pkg_width_cm'),
        pkg_height_cm: preferExcludedValue('pkg_height_cm'),
        pkg_weight_kg: preferExcludedValue('pkg_weight_kg'),
        bought_past_month: preferExcludedValue('bought_past_month'),
        fba_fee: preferExcludedValue('fba_fee'),
        referral_fee: preferExcludedValue('referral_fee'),
        scrape_status: mergeScrapeStatus(),
        enriched_at: preferExcludedValue('enriched_at'),
        updated_at: sql.raw(excludedColumn('updated_at')),
    }
}

// ---------------------------------------------------------------------------
// Amazon products
// ---------------------------------------------------------------------------

export async function getAmazonProductByAsin(
    db: PgDb,
    asin: string,
): Promise<AmazonProduct | null> {
    const rows = await db
        .select()
        .from(amazonProducts)
        .where(eq(amazonProducts.asin, asin))
        .limit(1)
    return (rows[0] ?? null) as AmazonProduct | null
}

export async function upsertAmazonProduct(
    db: PgDb,
    product: AmazonProductInsert,
): Promise<AmazonProduct> {
    const now = new Date().toISOString()
    const rows = await db
        .insert(amazonProducts)
        .values({ ...product, updated_at: now } as typeof amazonProducts.$inferInsert)
        .onConflictDoUpdate({
            target: amazonProducts.asin,
            set: buildAmazonProductMergeSet(),
        })
        .returning()
    return rows[0] as AmazonProduct
}

export async function upsertAmazonProducts(
    db: PgDb,
    products: AmazonProductInsert[],
): Promise<AmazonProduct[]> {
    if (products.length === 0) return []
    const now = new Date().toISOString()
    const rows = await db
        .insert(amazonProducts)
        .values(products.map((p) => ({ ...p, updated_at: now })) as typeof amazonProducts.$inferInsert[])
        .onConflictDoUpdate({
            target: amazonProducts.asin,
            set: buildAmazonProductMergeSet(),
        })
        .returning()
    return rows as AmazonProduct[]
}

export async function updateAmazonProduct(
    db: PgDb,
    asin: string,
    update: AmazonProductUpdate,
): Promise<AmazonProduct> {
    const rows = await db
        .update(amazonProducts)
        .set({ ...update, updated_at: new Date().toISOString() } as Partial<typeof amazonProducts.$inferInsert>)
        .where(eq(amazonProducts.asin, asin))
        .returning()
    if (!rows[0]) throw new Error(`${SERVICE_ERROR_PREFIXES.UPDATE_AMAZON_PRODUCT_FAILED}: asin ${asin} not found`)
    return rows[0] as AmazonProduct
}

/**
 * Returns products that have been scraped but not yet enriched via SP-API.
 * Used by background cron / enrichment jobs.
 */
export async function getProductsNeedingEnrichment(
    db: PgDb,
    limit = 50,
): Promise<AmazonProduct[]> {
    const rows = await db
        .select()
        .from(amazonProducts)
        .where(and(eq(amazonProducts.scrape_status, 'scraped'), isNull(amazonProducts.enriched_at)))
        .orderBy(asc(amazonProducts.created_at))
        .limit(limit)
    return rows as AmazonProduct[]
}

/**
 * Returns keyword-linked products that need SP-API enrichment repair:
 *  - `enrichment_failed`: enrichment was attempted but SP-API returned an error/404.
 *  - `scraped`: product was stored from the HTML scraper but the enrichment step
 *    was never attempted (e.g. product appeared before the enrichment pipeline existed).
 *
 * Only returns products that have no category ranks yet — products with ranks
 * were partially enriched and are lower priority.
 *
 * Used by the repair job to back-fill brand, listing_date, dimensions, and
 * category ranks for positions 21-60 and any pre-pipeline products.
 */
export async function getKeywordProductsNeedingEnrichmentRepair(
    db: PgDb,
    limit = 500,
): Promise<AmazonProduct[]> {
    const rows = await db
        .select({ product: amazonProducts })
        .from(amazonProducts)
        .innerJoin(amazonKeywordProducts, eq(amazonKeywordProducts.asin, amazonProducts.asin))
        .where(
            and(
                or(
                    eq(amazonProducts.scrape_status, 'enrichment_failed'),
                    eq(amazonProducts.scrape_status, 'scraped'),
                ),
                notExists(
                    db
                        .select({ one: sql`1` })
                        .from(productCategoryRanks)
                        .where(eq(productCategoryRanks.asin, amazonProducts.asin)),
                ),
            ),
        )
        .orderBy(desc(amazonProducts.review_count))
        .limit(limit)
    // Deduplicate (same ASIN linked to multiple keywords → multiple join rows)
    const seen = new Set<string>()
    const unique: AmazonProduct[] = []
    for (const r of rows) {
        if (!seen.has(r.product.asin)) {
            seen.add(r.product.asin)
            unique.push(r.product as AmazonProduct)
        }
    }
    return unique
}

/**
 * Returns keyword-linked products that have null bought_past_month.
 * Ordered by review_count DESC so high-demand products repair first.
 *
 * Used by the repair job to back-fill bought_past_month for all existing keywords
 * that were scraped before bpm-repair was introduced.
 */
export async function getKeywordProductsNeedingBpmRepair(
    db: PgDb,
    limit = 500,
): Promise<Array<{ asin: string; product_url: string | null }>> {
    const rows = await db
        .selectDistinct({ asin: amazonProducts.asin, product_url: amazonProducts.product_url })
        .from(amazonProducts)
        .innerJoin(amazonKeywordProducts, eq(amazonKeywordProducts.asin, amazonProducts.asin))
        .where(isNull(amazonProducts.bought_past_month))
        .orderBy(desc(amazonProducts.review_count))
        .limit(limit)
    return rows
}

// ---------------------------------------------------------------------------
// Product category ranks
// ---------------------------------------------------------------------------

export async function upsertProductCategoryRank(
    db: PgDb,
    rank: ProductCategoryRankInsert,
): Promise<ProductCategoryRank> {
    const rows = await db
        .insert(productCategoryRanks)
        .values(rank as typeof productCategoryRanks.$inferInsert)
        .onConflictDoUpdate({
            target: [productCategoryRanks.asin, productCategoryRanks.category_id],
            set: {
                rank: sql`excluded.rank`,
                rank_type: sql`excluded.rank_type`,
                observed_at: sql`excluded.observed_at`,
            },
        })
        .returning()
    return rows[0] as ProductCategoryRank
}

export async function upsertProductCategoryRanks(
    db: PgDb,
    ranks: ProductCategoryRankInsert[],
): Promise<ProductCategoryRank[]> {
    if (ranks.length === 0) return []

    const rows = await db
        .insert(productCategoryRanks)
        .values(ranks as typeof productCategoryRanks.$inferInsert[])
        .onConflictDoUpdate({
            target: [productCategoryRanks.asin, productCategoryRanks.category_id],
            set: {
                rank: sql`excluded.rank`,
                rank_type: sql`excluded.rank_type`,
                observed_at: sql`excluded.observed_at`,
            },
        })
        .returning()

    return rows as ProductCategoryRank[]
}

export async function getKnownAmazonCategoryIds(
    db: PgDb,
    categoryIds: readonly string[],
    marketplace: string,
): Promise<Set<string>> {
    if (categoryIds.length === 0) return new Set()

    const uniqueIds = Array.from(new Set(categoryIds))
    const rows = await db
        .select({ id: amazonCategories.id })
        .from(amazonCategories)
        .where(and(
            inArray(amazonCategories.id, uniqueIds),
            eq(amazonCategories.marketplace, marketplace),
        ))

    return new Set(rows.map((row) => row.id))
}

export async function getProductCategoryRanks(
    db: PgDb,
    asin: string,
): Promise<ProductCategoryRank[]> {
    const rows = await db
        .select()
        .from(productCategoryRanks)
        .where(eq(productCategoryRanks.asin, asin))
        .orderBy(desc(productCategoryRanks.observed_at))
    return rows as ProductCategoryRank[]
}

// ---------------------------------------------------------------------------
// Discover
// ---------------------------------------------------------------------------

/**
 * Return products matching the given discover filters.
 *
 * Performance strategy:
 *
 * The naive approach (one query with ORDER BY COALESCE(bpm*price, 0) DESC + LIMIT)
 * causes a full bitmap-heap scan of every matching row followed by an in-memory sort.
 * With 1.8 M rows in amazon_products and network-attached I/O on Fly.io, that easily
 * exceeds the 30 s statement timeout.
 *
 * Two-arm CTE instead:
 *  bpm_arm     – products that HAVE a scraped bought_past_month.
 *                ORDER BY (bought_past_month::numeric * price) DESC uses the existing
 *                `amazon_products_discover_bpm_revenue_idx` partial functional index.
 *                PostgreSQL does an index scan + LIMIT → fetches only `sampleSize`
 *                heap pages, not 20 K+.
 *  fallback_arm – products whose bought_past_month is NULL/0 (the bulk of the catalog).
 *                ORDER BY review_count DESC uses `amazon_products_review_count_idx`.
 *                Same LIMIT trick.
 *
 * The outer query merges ≤ 2×sampleSize rows and sorts them; that sort is trivially fast.
 *
 * Category filter:
 *  Step 1 — one cheap query resolves category display-names → DB category IDs
 *           (amazon_categories is tiny; result is a short list of integer IDs).
 *  Step 2 — EXISTS (… category_id IN ($ids)) uses product_category_ranks_asin_idx
 *           instead of a per-row JOIN on amazon_categories.breadcrumb.
 */
export async function discoverProducts(
    db: PgDb,
    filters: DiscoverFilters,
): Promise<ProductFinancial[]> {
    const { minPrice, maxPrice, minRating, maxRating, minReviews, maxReviews, categories, limit } =
        filters

    // ── Step 1: resolve category filter ──────────────────────────────────────
    // Pre-fetch ASINs via category_id_idx (fast index scan, early-stop at LIMIT).
    // Then use `asin IN (asins)` in the CTE arms — Bitmap Index Scan on pkey
    // instead of a per-row EXISTS check that forces Seq Scan on 1.8M rows.
    let catClause = sql``
    if (categories.length > 0) {
        const selectedDefs = AMAZON_CATEGORIES.filter((c) => categories.includes(c.id))
        if (selectedDefs.length === 0) return []

        const allNames = selectedDefs.flatMap((c) => c.displayNames)
        const nameList = sql.join(allNames.map((n) => sql`${n}`), sql`, `)

        // Step 1a: resolve display-names → category IDs (amazon_categories is tiny; fast).
        const catRows = await db.execute(
            sql`SELECT id FROM amazon_categories WHERE breadcrumb[1] IN (${nameList})`,
        )
        const ids = (catRows.rows as { id: string }[]).map((r) => r.id)
        if (ids.length === 0) return []

        // Step 1b: pre-fetch ASINs via category_id_idx (early-stop at LIMIT, no ORDER BY).
        // Duplicates across subcategories are fine — IN clause handles them silently.
        const asinFetchLimit = Math.max(limit * 50, 1000)
        const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `)
        const asinRows = await db.execute(
            sql`SELECT asin FROM product_category_ranks WHERE category_id IN (${idList}) LIMIT ${asinFetchLimit}`,
        )
        const asins = (asinRows.rows as { asin: string }[]).map((r) => r.asin)
        if (asins.length === 0) return []

        const asinList = sql.join(asins.map((a) => sql`${a}`), sql`, `)
        catClause = sql`AND p.asin IN (${asinList})`
    }

    // ── Step 2: build scalar WHERE (shared by both arms) ─────────────────────
    let baseWhere = sql`p.price IS NOT NULL AND p.price > 0`
    if (minPrice != null) baseWhere = sql`${baseWhere} AND p.price >= ${minPrice}`
    if (maxPrice != null) baseWhere = sql`${baseWhere} AND p.price <= ${maxPrice}`
    if (minRating != null) baseWhere = sql`${baseWhere} AND p.rating >= ${minRating}`
    if (maxRating != null) baseWhere = sql`${baseWhere} AND p.rating <= ${maxRating}`
    if (minReviews != null) baseWhere = sql`${baseWhere} AND p.review_count >= ${minReviews}`
    if (maxReviews != null) baseWhere = sql`${baseWhere} AND p.review_count <= ${maxReviews}`

    // sampleSize: how many candidates to pull from each arm before the outer re-sort.
    // Large enough to cover a wide result set; small enough that the outer sort is trivial.
    const sampleSize = Math.max(limit * 5, 100)

    // ── Step 3: two-arm CTE ───────────────────────────────────────────────────
    const productRows = await db.execute(sql`
        WITH
        bpm_arm AS MATERIALIZED (
            -- Uses amazon_products_discover_bpm_revenue_idx:
            --   partial index on ((bought_past_month::numeric * price) DESC)
            --   WHERE bought_past_month IS NOT NULL AND bought_past_month > 0
            --         AND price IS NOT NULL AND price > 0
            SELECT p.*
            FROM amazon_products p
            WHERE ${baseWhere}
              AND p.bought_past_month IS NOT NULL
              AND p.bought_past_month > 0
              ${catClause}
            ORDER BY (p.bought_past_month::numeric * p.price) DESC
            LIMIT ${sampleSize}
        ),
        fallback_arm AS MATERIALIZED (
            -- Uses price index or seq-scan-with-early-stop; no ORDER BY so Postgres
            -- stops after finding sampleSize matching rows — the outer sort handles ranking.
            SELECT p.*
            FROM amazon_products p
            WHERE ${baseWhere}
              AND (p.bought_past_month IS NULL OR p.bought_past_month = 0)
              ${catClause}
            LIMIT ${sampleSize}
        ),
        combined AS (
            SELECT * FROM bpm_arm
            UNION ALL
            SELECT * FROM fallback_arm
        )
        SELECT * FROM combined
        ORDER BY
            COALESCE(bought_past_month::numeric * price, 0) DESC NULLS LAST,
            review_count DESC NULLS LAST
        LIMIT ${limit}
    `)

    const products = productRows.rows as unknown as AmazonProduct[]
    if (products.length === 0) return []

    // Batch-fetch BSR rank for each product — used for rank/category display fields
    // in ProductFinancial (category_id, rank, category_path). Revenue is based solely
    // on bought_past_month; products without that badge will show null monthly_revenue.
    const asins = products.map((p) => p.asin).filter((a): a is string => a !== null)
    const bsrRows = await db
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
        .orderBy(asc(productCategoryRanks.asin), asc(productCategoryRanks.rank))

    const bsrByAsin = new Map<string, BsrRow>()
    for (const row of bsrRows as Array<BsrRow & { asin: string }>) {
        if (!bsrByAsin.has(row.asin)) bsrByAsin.set(row.asin, row)
    }

    return products.map((product) =>
        buildProductFinancial(product, bsrByAsin.get(product.asin ?? '') ?? null),
    )
}
