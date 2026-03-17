import type { ProductRow, CategoryRankRow } from '../types'
import { log } from '../../../shared/logger'
import { AMAZON_CONFIG } from '../config'
import { IS_DEBUG, type DB } from '../../../shared/db'

export async function upsertProducts(db: DB, rows: ProductRow[]): Promise<void> {
    for (let i = 0; i < rows.length; i += AMAZON_CONFIG.batch_size) {
        const batch = rows.slice(i, i + AMAZON_CONFIG.batch_size)
        const batchLabel = `batch ${Math.floor(i / AMAZON_CONFIG.batch_size) + 1}/${Math.ceil(rows.length / AMAZON_CONFIG.batch_size)}`

        log.db.uploadStart('amazon_products', batch.length)
        if (IS_DEBUG) batch.forEach(r => log.db.productRow(r))

        const t0 = Date.now()
        const { error } = await db
            .from('amazon_products')
            .upsert(batch, { onConflict: 'asin' })

        if (error) {
            log.db.error('amazon_products', 'upsert', error, batchLabel)
        } else {
            log.db.uploadDone('amazon_products', batch.length, Date.now() - t0)
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
        const { error } = await db
            .from('product_category_ranks')
            .upsert(batch, { onConflict: 'asin,category_id' })

        if (error) {
            log.db.error('product_category_ranks', 'upsert', error, batchLabel)
        } else {
            log.db.uploadDone('product_category_ranks', batch.length, Date.now() - t0)
        }
    }
}
