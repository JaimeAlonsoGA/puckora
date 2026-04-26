/**
 * Single-product fetching from Fly.io Postgres.
 *
 * Runs product PK lookup + BSR rank lookup in parallel,
 * then delegates financial computation to buildProductFinancial().
 */

import { eq, sql } from 'drizzle-orm'
import { type PgDb, amazonProducts } from '@puckora/db'
import type { AmazonProduct, ProductFinancial } from '@puckora/types'
import { buildProductFinancial, type BsrRow } from '@/lib/financials'

interface BsrQueryRow extends BsrRow {
    asin: string
}

export async function getProductByAsin(
    db: PgDb,
    asin: string,
): Promise<ProductFinancial | null> {
    const [productRows, bsrResult] = await Promise.all([
        db.select().from(amazonProducts).where(eq(amazonProducts.asin, asin)).limit(1),
        db.execute(sql`
            SELECT DISTINCT ON (pcr.asin)
                pcr.asin,
                pcr.category_id,
                pcr.rank,
                pcr.rank_type,
                pcr.observed_at,
                ac.depth       AS category_depth,
                ac.full_path   AS category_path
            FROM product_category_ranks pcr
            JOIN amazon_categories ac ON ac.id = pcr.category_id
            WHERE pcr.asin = ${asin}
              AND pcr.rank_type = 'best_seller'
            ORDER BY pcr.asin, pcr.rank ASC
            LIMIT 1
        `),
    ])

    if (productRows.length === 0) return null

    const product = productRows[0] as AmazonProduct
    const bsr = (bsrResult.rows[0] as unknown as BsrQueryRow | undefined) ?? null
    return buildProductFinancial(product, bsr)
}
