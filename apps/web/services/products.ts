/**
 * Drizzle service layer — Amazon products & category ranks (Fly.io Postgres).
 *
 * All functions accept a PgDb instance so they work from Server Components,
 * Route Handlers, and background jobs with a shared singleton.
 */

import { eq, isNull, asc, desc, sql } from 'drizzle-orm'
import {
    type PgDb,
    amazonProducts,
    productCategoryRanks,
} from '@puckora/db'
import type {
    AmazonProduct,
    AmazonProductInsert,
    AmazonProductUpdate,
    ProductCategoryRank,
    ProductCategoryRankInsert,
} from '@puckora/types'

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
            set: {
                title: sql`excluded.title`,
                brand: sql`excluded.brand`,
                manufacturer: sql`excluded.manufacturer`,
                price: sql`excluded.price`,
                rating: sql`excluded.rating`,
                review_count: sql`excluded.review_count`,
                main_image_url: sql`excluded.main_image_url`,
                product_url: sql`excluded.product_url`,
                product_type: sql`excluded.product_type`,
                color: sql`excluded.color`,
                model_number: sql`excluded.model_number`,
                package_quantity: sql`excluded.package_quantity`,
                bullet_points: sql`excluded.bullet_points`,
                browse_node_id: sql`excluded.browse_node_id`,
                listing_date: sql`excluded.listing_date`,
                item_length_cm: sql`excluded.item_length_cm`,
                item_width_cm: sql`excluded.item_width_cm`,
                item_height_cm: sql`excluded.item_height_cm`,
                item_weight_kg: sql`excluded.item_weight_kg`,
                pkg_length_cm: sql`excluded.pkg_length_cm`,
                pkg_width_cm: sql`excluded.pkg_width_cm`,
                pkg_height_cm: sql`excluded.pkg_height_cm`,
                pkg_weight_kg: sql`excluded.pkg_weight_kg`,
                fba_fee: sql`excluded.fba_fee`,
                referral_fee: sql`excluded.referral_fee`,
                scrape_status: sql`excluded.scrape_status`,
                enriched_at: sql`excluded.enriched_at`,
                updated_at: sql`excluded.updated_at`,
            },
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
            set: {
                title: sql`excluded.title`,
                brand: sql`excluded.brand`,
                manufacturer: sql`excluded.manufacturer`,
                price: sql`excluded.price`,
                rating: sql`excluded.rating`,
                review_count: sql`excluded.review_count`,
                main_image_url: sql`excluded.main_image_url`,
                product_url: sql`excluded.product_url`,
                scrape_status: sql`excluded.scrape_status`,
                enriched_at: sql`excluded.enriched_at`,
                updated_at: sql`excluded.updated_at`,
            },
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
    if (!rows[0]) throw new Error(`updateAmazonProduct: asin ${asin} not found`)
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
        .where(eq(amazonProducts.scrape_status, 'scraped') && isNull(amazonProducts.enriched_at))
        .orderBy(asc(amazonProducts.created_at))
        .limit(limit)
    return rows as AmazonProduct[]
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
