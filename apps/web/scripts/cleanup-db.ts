/**
 * DB cleanup: drops the removed product_financials view, removes obsolete
 * discover-era indexes, and creates the bought_past_month revenue index used
 * by the current discoverProducts path.
 *
 * Run with: cd apps/web && DATABASE_PROXY_URL=... npx tsx --tsconfig tsconfig.json scripts/cleanup-db.ts
 */
import { Pool } from 'pg'

if (process.env['DATABASE_PROXY_URL']) {
    process.env['DATABASE_URL'] = process.env['DATABASE_PROXY_URL']
}

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] })
const DISCOVER_REVENUE_INDEX = 'amazon_products_discover_bpm_revenue_idx'

async function run() {
    const client = await pool.connect()
    try {
        // ── 1. Informational: list functions and triggers ─────────────────────

        const fns = await client.query(`
            SELECT proname, pg_get_function_identity_arguments(oid) AS args
            FROM pg_proc
            WHERE pronamespace = 'public'::regnamespace
            ORDER BY proname
        `)
        console.log(`\nFunctions in public schema (${fns.rows.length}):`)
        fns.rows.forEach((r: { proname: string; args: string }) =>
            console.log(`  ${r.proname}(${r.args})`),
        )

        const trigs = await client.query(`
            SELECT tgname, relname AS table_name
            FROM pg_trigger tg
            JOIN pg_class cl ON cl.oid = tg.tgrelid
            WHERE NOT tgisinternal
            ORDER BY relname, tgname
        `)
        console.log(`\nTriggers (${trigs.rows.length}):`)
        trigs.rows.forEach((r: { tgname: string; table_name: string }) =>
            console.log(`  ${r.table_name}.${r.tgname}`),
        )

        // ── 2. Show current index state ──────────────────────────────────────

        const idxBefore = await client.query(`
            SELECT tablename, indexname, indexdef
            FROM pg_indexes
            WHERE tablename IN ('amazon_products', 'product_category_ranks')
            ORDER BY tablename, indexname
        `)
        console.log('\nIndexes before cleanup:')
        idxBefore.rows.forEach((r: { tablename: string; indexname: string; indexdef: string }) =>
            console.log(`  [${r.tablename}] ${r.indexname}`),
        )

        // ── 3. Drop the product_financials view ──────────────────────────────

        console.log('\nDropping product_financials view...')
        await client.query('DROP VIEW IF EXISTS product_financials')
        console.log('  ✓ product_financials view dropped (or did not exist)')

        // ── 4. Drop deprecated indexes ────────────────────────────────────────

        const toDrop = [
            // Old BSR-side discover indexes are obsolete after moving discover
            // to bought_past_month-first filtering on amazon_products.
            'product_category_ranks_bs_canonical_idx',
            'product_category_ranks_bsr_top300k_idx',
            // Duplicate partial indexes from the abandoned BSR discover path.
            'idx_amazon_products_price',
            'idx_amazon_products_rating',
            'idx_amazon_products_review_count',
        ]
        for (const idx of toDrop) {
            console.log(`  Dropping index: ${idx}...`)
            await client.query(`DROP INDEX CONCURRENTLY IF EXISTS "${idx}"`)
            console.log(`  ✓ ${idx}`)
        }

        // ── 5. Create the discover revenue index ─────────────────────────────

        const existing = await client.query(`
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'amazon_products'
              AND indexname = '${DISCOVER_REVENUE_INDEX}'
        `)

        if (existing.rows.length > 0) {
            console.log(`\n${DISCOVER_REVENUE_INDEX} already exists — skipping.`)
        } else {
            console.log(`\nCreating ${DISCOVER_REVENUE_INDEX}...`)
            console.log('  (this may take a while on Fly.io — statement_timeout disabled for this step)')
            await client.query(`SET statement_timeout = 0`)
            const start = Date.now()
                        await client.query(`
                                CREATE INDEX CONCURRENTLY ${DISCOVER_REVENUE_INDEX}
                                ON amazon_products (((bought_past_month * price)) DESC)
                                WHERE bought_past_month IS NOT NULL
                                    AND bought_past_month > 0
                                    AND price IS NOT NULL
                                    AND price > 0
                        `)
            await client.query(`RESET statement_timeout`)
            const ms = Date.now() - start
            console.log(`  ✓ Index created in ${(ms / 1000).toFixed(1)} s`)

            const count = await client.query(`
                SELECT count(*) FROM amazon_products
                WHERE bought_past_month IS NOT NULL
                  AND bought_past_month > 0
                  AND price IS NOT NULL
                  AND price > 0
            `)
            console.log(`  Covers ${count.rows[0].count} rows`)
        }

        // ── 6. Final index state ─────────────────────────────────────────────

        const idxAfter = await client.query(`
            SELECT tablename, indexname
            FROM pg_indexes
            WHERE tablename IN ('amazon_products', 'product_category_ranks')
            ORDER BY tablename, indexname
        `)
        console.log('\nIndexes after cleanup:')
        idxAfter.rows.forEach((r: { tablename: string; indexname: string }) =>
            console.log(`  [${r.tablename}] ${r.indexname}`),
        )

        console.log('\n✅ Cleanup complete.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((err: unknown) => {
    console.error(err)
    process.exit(1)
})
