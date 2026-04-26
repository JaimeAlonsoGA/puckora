/**
 * One-time maintenance: update PostgreSQL planner statistics for the tables
 * used by discoverProducts so the query planner can choose efficient index plans.
 *
 * Root cause of the discover timeout: pg_stat_user_tables shows ~352 live rows
 * while the actual table has millions → planner picks seq scan → 30s timeout.
 *
 * Usage (from apps/web/):
 *   npx tsx --tsconfig tsconfig.json scripts/analyze-discover-tables.ts
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
if (process.env['DATABASE_PROXY_URL']) {
    process.env['DATABASE_URL'] = process.env['DATABASE_PROXY_URL']
}

import { Pool } from 'pg'

const pool = new Pool({
    connectionString: process.env['DATABASE_URL'],
    statement_timeout: 600_000, // 10 minutes — ANALYZE on large tables takes time
})

async function run() {
    console.log('Running ANALYZE to refresh planner statistics...\n')

    const before = await pool.query<{ relname: string; n_live_tup: string }>(
        `SELECT relname, n_live_tup
         FROM pg_stat_user_tables
         WHERE relname IN ('amazon_products', 'product_category_ranks')
         ORDER BY relname`,
    )
    console.log('Before ANALYZE (stale estimates):')
    for (const row of before.rows) {
        console.log(`  ${row.relname}: ~${Number(row.n_live_tup).toLocaleString()} rows`)
    }
    console.log()

    const tables = ['amazon_products', 'product_category_ranks', 'amazon_categories']
    for (const table of tables) {
        const t = Date.now()
        process.stdout.write(`  ANALYZE ${table}...`)
        await pool.query(`ANALYZE ${table}`)
        console.log(` ✓ (${Date.now() - t}ms)`)
    }
    console.log()

    const after = await pool.query<{ relname: string; n_live_tup: string }>(
        `SELECT relname, n_live_tup
         FROM pg_stat_user_tables
         WHERE relname IN ('amazon_products', 'product_category_ranks', 'amazon_categories')
         ORDER BY relname`,
    )
    console.log('After ANALYZE (fresh estimates):')
    for (const row of after.rows) {
        console.log(`  ${row.relname}: ~${Number(row.n_live_tup).toLocaleString()} rows`)
    }
    console.log('\nDone ✓  — re-run test-discover.ts to confirm query performance.')
}

run()
    .catch(e => { console.error('\nFAILED:', (e as Error).message); process.exit(1) })
    .finally(() => pool.end().then(() => process.exit(0)))
