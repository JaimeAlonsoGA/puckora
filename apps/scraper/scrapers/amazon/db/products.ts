import { sql } from 'drizzle-orm'
import type { InferInsertModel } from 'drizzle-orm'
import { amazonProducts, productCategoryRanks } from '@puckora/db'
import type { ProductRow, CategoryRankRow } from '../types'
import { log } from '../../../shared/logger'
import { AMAZON_CONFIG } from '../config'
import { IS_DEBUG, type DB } from '../../../shared/db'

// ProductRow derives from AmazonProductInsert — field names and types are
// deliberately kept identical so the cast below is structurally safe.
type PgProductInsert = InferInsertModel<typeof amazonProducts>
type PgRankInsert = InferInsertModel<typeof productCategoryRanks>

export async function upsertProducts(db: DB, rows: ProductRow[]): Promise<void> {
    for (let i = 0; i < rows.length; i += AMAZON_CONFIG.batch_size) {
        const batch = rows.slice(i, i + AMAZON_CONFIG.batch_size)
        const batchLabel = `batch ${Math.floor(i / AMAZON_CONFIG.batch_size) + 1}/${Math.ceil(rows.length / AMAZON_CONFIG.batch_size)}`

        log.db.uploadStart('amazon_products', batch.length)
        if (IS_DEBUG) batch.forEach(r => log.db.productRow(r))

        const t0 = Date.now()
        try {
            await db
                .insert(amazonProducts)
                .values(batch as PgProductInsert[])
                .onConflictDoUpdate({
                    target: amazonProducts.asin,
                    set: {
                        title: sql`excluded.title`,
                        brand: sql`excluded.brand`,
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
            log.db.uploadDone('amazon_products', batch.length, Date.now() - t0)
        } catch (err) {
            log.db.error('amazon_products', 'upsert', err as Error, batchLabel)
        }
    }
}

export async function upsertRanks(db: DB, rows: CategoryRankRow[]): Promise<void> {
    for (let i = 0; i < rows.length; i += AMAZON_CONFIG.batch_size) {
        const batch = rows.slice(i, i + AMAZON_CONFIG.batch_size)
        const batchLabel = `batch ${Math.floor(i / AMAZON_CONFIG.batch_size) + 1}/${Math.ceil(rows.length / AMAZON_CONFIG.batch_size)}`

        log.db.uploadStart('product_category_ranks', batch.length)
        if (IS_DEBUG) batch.forEach(r => log.db.rankRow(r))

        const t0 = Date.now()
        try {
            await db
                .insert(productCategoryRanks)
                .values(batch as PgRankInsert[])
                .onConflictDoUpdate({
                    target: [productCategoryRanks.asin, productCategoryRanks.category_id],
                    set: {
                        rank: sql`excluded.rank`,
                        rank_type: sql`excluded.rank_type`,
                        observed_at: sql`excluded.observed_at`,
                    },
                })
            log.db.uploadDone('product_category_ranks', batch.length, Date.now() - t0)
        } catch (err) {
            log.db.error('product_category_ranks', 'upsert', err as Error, batchLabel)
        }
    }
}
