import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@puckora/types'
import { CONFIG } from './config'
import { ProductRow, CategoryRankRow } from './types'
import { log } from './logger'

export type DB = SupabaseClient<Database>

// Debug mode: log every row + timing for uploads
const IS_DEBUG = process.argv.includes('--upload-test') || process.argv.includes('--test')

export function createDb(): DB {
  return createClient<Database>(CONFIG.supabase_url, CONFIG.supabase_key)
}

// ─── UPSERT PRODUCTS ─────────────────────────────────────────────────────────

export async function upsertProducts(db: DB, rows: ProductRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += CONFIG.batch_size) {
    const batch = rows.slice(i, i + CONFIG.batch_size)
    const batchLabel = `batch ${Math.floor(i / CONFIG.batch_size) + 1}/${Math.ceil(rows.length / CONFIG.batch_size)}`

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

// ─── UPSERT RANKS ────────────────────────────────────────────────────────────

export async function upsertRanks(db: DB, rows: CategoryRankRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += CONFIG.batch_size) {
    const batch = rows.slice(i, i + CONFIG.batch_size)
    const batchLabel = `batch ${Math.floor(i / CONFIG.batch_size) + 1}/${Math.ceil(rows.length / CONFIG.batch_size)}`

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

// ─── CATEGORY STATUS ─────────────────────────────────────────────────────────

export async function markCategoryScraped(db: DB, categoryId: string): Promise<void> {
  const { error } = await db
    .from('amazon_categories')
    .update({ scrape_status: 'scraped', last_scraped_at: new Date().toISOString() })
    .eq('id', categoryId)
  if (error) log.db.error('amazon_categories', 'markScraped', error, categoryId)
}

export async function markCategoryFailed(db: DB, categoryId: string): Promise<void> {
  const { error } = await db
    .from('amazon_categories')
    .update({ scrape_status: 'failed' })
    .eq('id', categoryId)
  if (error) log.db.error('amazon_categories', 'markFailed', error, categoryId)
}
