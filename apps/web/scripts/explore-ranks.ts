/**
 * Exploratory script to understand the BSR rank distribution.
 */
import { Pool } from 'pg'

if (process.env['DATABASE_PROXY_URL']) {
    process.env['DATABASE_URL'] = process.env['DATABASE_PROXY_URL']
}

const pool = new Pool({ connectionString: process.env['DATABASE_URL']! })

async function main() {
    const c = await pool.connect()
    
    const caps = [500, 1000, 3000, 5000, 10000, 30000]
    for (const cap of caps) {
        const r = await c.query(
            `SELECT COUNT(DISTINCT asin) AS distinct_asins, COUNT(*) AS total_rows
             FROM product_category_ranks
             WHERE rank_type = 'best_seller' AND rank BETWEEN 1 AND $1`,
            [cap]
        )
        console.log(`rank <= ${cap.toString().padStart(6)}: ${r.rows[0].distinct_asins} distinct ASINs, ${r.rows[0].total_rows} total rows`)
    }
    
    // Check bought_past_month coverage
    const bpm = await c.query(`SELECT COUNT(*) FROM amazon_products WHERE bought_past_month IS NOT NULL AND bought_past_month > 0`)
    console.log(`\namazon_products with bought_past_month > 0: ${bpm.rows[0].count}`)
    
    const priceRangeCount = await c.query(`
        SELECT COUNT(*) FROM amazon_products
        WHERE price BETWEEN 15 AND 23 AND bought_past_month IS NOT NULL AND bought_past_month > 0`)
    console.log(`price $15-$23 WITH bought_past_month: ${priceRangeCount.rows[0].count}`)
    
    c.release()
    await pool.end()
}
main().catch(console.error)
