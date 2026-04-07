/**
 * Single-product fetching from Fly.io Postgres.
 *
 * Tries the `product_financials` view first (enriched data).
 * Falls back to raw `amazon_products` if the ASIN has not yet been enriched.
 */

import { eq } from 'drizzle-orm'
import { type PgDb, amazonProducts, productFinancialsView } from '@puckora/db'
import type { AmazonProduct, ProductFinancial } from '@puckora/types'
import { mapAmazonProductToFinancial } from '@/services/keywords'

/**
 * Drizzle returns Postgres `numeric` columns as strings.
 * The ProductFinancial type declares them as `number | null`, so we coerce here.
 */
function normalizeViewRow(row: typeof productFinancialsView.$inferSelect): ProductFinancial {
    const toNum = (v: unknown) => (v == null ? null : Number(v))
    return {
        ...row,
        total_amazon_fees: toNum(row.total_amazon_fees),
        amazon_fee_pct: toNum(row.amazon_fee_pct),
        net_per_unit: toNum(row.net_per_unit),
        monthly_revenue: toNum(row.monthly_revenue),
        monthly_net: toNum(row.monthly_net),
        daily_velocity: toNum(row.daily_velocity),
        review_rate_per_month: toNum(row.review_rate_per_month),
    } as ProductFinancial
}

export async function getProductByAsin(
    db: PgDb,
    asin: string,
): Promise<ProductFinancial | null> {
    const rows = await db
        .select()
        .from(productFinancialsView)
        .where(eq(productFinancialsView.asin, asin))
        .limit(1)

    if (rows.length > 0) return normalizeViewRow(rows[0])

    // Fallback: product exists but hasn't hit the financials view yet
    const raw = await db
        .select()
        .from(amazonProducts)
        .where(eq(amazonProducts.asin, asin))
        .limit(1)

    if (raw.length === 0) return null
    return mapAmazonProductToFinancial(raw[0] as AmazonProduct)
}
