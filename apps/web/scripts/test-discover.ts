/**
 * Quick smoke test for discoverProducts.
 * Usage: tsx --tsconfig tsconfig.json scripts/test-discover.ts
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
if (process.env['DATABASE_PROXY_URL']) {
    process.env['DATABASE_URL'] = process.env['DATABASE_PROXY_URL']
}

import { createDb } from '@puckora/db'
import { discoverProducts } from '@/services/products'

const db = createDb(process.env['DATABASE_URL']!)

async function checkDb() {
    const { sql } = await import('drizzle-orm')
    // Use pg_stat_user_tables for fast row-count estimates (no full scan)
    const [stats, idx, idxDefs] = await Promise.all([
        db.execute(sql`
            SELECT relname, n_live_tup
            FROM pg_stat_user_tables
            WHERE relname IN ('amazon_products', 'product_category_ranks')
            ORDER BY relname
        `),
        db.execute(sql`SELECT indexname FROM pg_indexes WHERE tablename IN ('amazon_products','product_category_ranks') ORDER BY tablename, indexname`),
        db.execute(sql`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'amazon_products' AND indexname = 'amazon_products_discover_bpm_revenue_idx'`),
    ])
    for (const row of stats.rows as any[]) {
        console.log(`${row.relname}: ~${Number(row.n_live_tup).toLocaleString()} rows (estimate)`)
    }
    console.log(`indexes: ${(idx.rows as any[]).map(r => r.indexname).join(', ')}`)
    for (const row of idxDefs.rows as any[]) {
        console.log(`discover idx def: ${row.indexdef}`)
    }

    // EXPLAIN the failing query (no ANALYZE — avoids timing out)
    const explain = await db.execute(sql`
        EXPLAIN SELECT p.*
        FROM amazon_products p
        WHERE p.price IS NOT NULL AND p.price > 0
          AND p.price >= 20 AND p.price <= 25
          AND p.rating >= 2.5 AND p.rating <= 4
          AND p.review_count <= 5000
        ORDER BY COALESCE(p.bought_past_month * p.price, 0) DESC NULLS LAST,
                 p.review_count DESC NULLS LAST
        LIMIT 20
    `)
    // EXPLAIN the actual new CTE query
    const explainCte = await db.execute(sql`
        EXPLAIN WITH
        bpm_arm AS MATERIALIZED (
            SELECT p.*
            FROM amazon_products p
            WHERE p.price IS NOT NULL AND p.price > 0
              AND p.rating >= 4.5
              AND p.bought_past_month IS NOT NULL
              AND p.bought_past_month > 0
            ORDER BY (p.bought_past_month::numeric * p.price) DESC
            LIMIT 100
        ),
        fallback_arm AS MATERIALIZED (
            SELECT p.*
            FROM amazon_products p
            WHERE p.price IS NOT NULL AND p.price > 0
              AND p.rating >= 4.5
              AND (p.bought_past_month IS NULL OR p.bought_past_month = 0)
            ORDER BY p.review_count DESC NULLS LAST
            LIMIT 100
        ),
        combined AS (
            SELECT * FROM bpm_arm
            UNION ALL
            SELECT * FROM fallback_arm
        )
        SELECT * FROM combined
        ORDER BY COALESCE(bought_past_month::numeric * price, 0) DESC NULLS LAST,
                 review_count DESC NULLS LAST
        LIMIT 20
    `)
    console.log('\nEXPLAIN (new CTE, rating ≥ 4.5):')
    for (const row of explainCte.rows as any[]) console.log(' ', row['QUERY PLAN'])

    console.log()
}

async function run() {
    await checkDb()
    const tests: Array<{ label: string; filters: Parameters<typeof discoverProducts>[1] }> = [
        { label: 'price $15-$23, no categories', filters: { minPrice: 15, maxPrice: 23, categories: [], limit: 20 } },
        { label: 'rating ≥ 4.5, no categories', filters: { minRating: 4.5, categories: [], limit: 20 } },
        { label: 'reviews ≥ 500, no categories', filters: { minReviews: 500, categories: [], limit: 20 } },
        { label: 'baby category only', filters: { categories: ['baby'], limit: 20 } },
        { label: 'combined price+rating, no categories', filters: { minPrice: 20, maxPrice: 60, minRating: 4, categories: [], limit: 20 } },
        // The exact failing query from the bug report
        {
            label: '⚠ failing query (price $20-25, rating 2.5-4, maxReviews 5000, health-beauty+home-kitchen)',
            filters: {
                minPrice: 20,
                maxPrice: 25,
                minRating: 2.5,
                maxRating: 4,
                maxReviews: 5000,
                categories: ['health-beauty', 'home-kitchen'],
                limit: 20,
            },
        },
        // A few more stress tests
        { label: 'sports', filters: { categories: ['sports'], limit: 20 } },
        {
            label: 'many categories + tight price',
            filters: {
                minPrice: 10,
                maxPrice: 30,
                minRating: 3.5,
                categories: ['health-beauty', 'home-kitchen', 'sports', 'baby', 'toys-games'],
                limit: 20,
            },
        },
        { label: 'default (no filters, limit 100)', filters: { categories: [], limit: 100 } },
    ]

    for (const { label, filters } of tests) {
        const t = Date.now()
        try {
            const rows = await discoverProducts(db, filters)
            const elapsed = Date.now() - t
            const withBPM = rows.filter((r) => r.bought_past_month != null).length
            const top = rows[0]
            console.log(
                `✓ [${label}] — ${rows.length} results in ${elapsed}ms (${withBPM}/${rows.length} have bpm)` +
                (top ? ` | top: ${top.asin} $${top.price} ⭐${top.rating} rev=${top.review_count} bpm=${top.bought_past_month ?? 'null'}` : ''),
            )
        } catch (e) {
            console.error(`✗ [${label}] — ${(e as Error).message} (${Date.now() - t}ms)`)
        }
    }
    process.exit(0)
}

run()
