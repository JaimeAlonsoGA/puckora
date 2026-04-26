/**
 * Times just the BSR DISTINCT ON query with various optimizations.
 */
import { Pool } from 'pg'

if (process.env['DATABASE_PROXY_URL']) {
    process.env['DATABASE_URL'] = process.env['DATABASE_PROXY_URL']
}

const pool = new Pool({ connectionString: process.env['DATABASE_URL']!, max: 1 })

async function timeQuery(label: string, fn: (c: any) => Promise<any>) {
    const c = await pool.connect()
    const start = Date.now()
    try {
        const result = await fn(c)
        const ms = Date.now() - start
        const rows = Array.isArray(result) ? result.length : result?.rows?.length ?? result?.rowCount ?? 0
        console.log(`${label}: ${ms}ms — ${rows} rows`)
    } catch (err: any) {
        const ms = Date.now() - start
        console.log(`${label}: FAILED after ${ms}ms — ${err.message}`)
    } finally {
        c.release()
    }
}

async function main() {
    const c0 = await pool.connect()
    await c0.query('SET statement_timeout = 300000')
    c0.release()

    // Test 1: DISTINCT ON with jit=off, no JOIN
    await timeQuery('DISTINCT ON (jit=off, no JOIN)', async (c) => {
        await c.query('BEGIN')
        await c.query('SET LOCAL jit = off')
        await c.query('SET LOCAL statement_timeout = 0')
        const r = await c.query(`
            SELECT DISTINCT ON (asin) asin, category_id, rank, rank_type, observed_at
            FROM product_category_ranks
            WHERE rank_type = 'best_seller'
            ORDER BY asin, rank ASC
        `)
        await c.query('COMMIT')
        return r
    })

    // Test 2: MIN(rank) GROUP BY — different plan
    await timeQuery('GROUP BY asin MIN(rank) (jit=off)', async (c) => {
        await c.query('BEGIN')
        await c.query('SET LOCAL jit = off')
        await c.query('SET LOCAL statement_timeout = 0')
        const r = await c.query(`
            SELECT asin, MIN(rank) AS rank
            FROM product_category_ranks
            WHERE rank_type = 'best_seller'
            GROUP BY asin
        `)
        await c.query('COMMIT')
        return r
    })

    // Test 3: COUNT only (baseline)
    await timeQuery('COUNT(*) best_seller (baseline)', async (c) => {
        const r = await c.query(`SELECT COUNT(*) FROM product_category_ranks WHERE rank_type = 'best_seller'`)
        return r
    })

    await pool.end()
}
main().catch(console.error)
