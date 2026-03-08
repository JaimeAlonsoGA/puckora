import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@puckora/types'
import { CONFIG } from './config'
import { ProductRow, CategoryRankRow } from './types'
import { log } from './logger'

export type DB = SupabaseClient<Database>

export function createDb(): DB {
  return createClient<Database>(CONFIG.supabase_url, CONFIG.supabase_key)
}

// ─── UPSERT PRODUCT ──────────────────────────────────────────────────────────
// Uses ASIN as natural PK — no UUID.
// On conflict (re-run) updates enrichment data, never overwrites scrape status if already enriched.

export async function upsertProduct(db: DB, row: ProductRow): Promise<void> {
  const { error } = await db
    .from('amazon_products')
    .upsert(row, { onConflict: 'asin' })

  if (error) log.error(`upsertProduct(${row.asin}): ${error.message}`)
}

export async function upsertProducts(db: DB, rows: ProductRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += CONFIG.batch_size) {
    const batch = rows.slice(i, i + CONFIG.batch_size)
    const { error } = await db
      .from('amazon_products')
      .upsert(batch, { onConflict: 'asin' })
    if (error) log.error(`upsertProducts batch: ${error.message}`)
  }
}

// ─── UPSERT CATEGORY RANK EDGES ──────────────────────────────────────────────
// PK is (asin, category_id) — one rank per product per category.
// On re-scrape, updates rank and observed_at.

export async function upsertRanks(db: DB, rows: CategoryRankRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += CONFIG.batch_size) {
    const batch = rows.slice(i, i + CONFIG.batch_size)
    const { error } = await db
      .from('product_category_ranks')
      .upsert(batch, { onConflict: 'asin,category_id' })
    if (error) log.error(`upsertRanks batch: ${error.message}`)
  }
}

// ─── CATEGORY STATUS ─────────────────────────────────────────────────────────

export async function markCategoryScraped(db: DB, categoryId: string): Promise<void> {
  const { error } = await db
    .from('amazon_categories')
    .update({ scrape_status: 'scraped', last_scraped_at: new Date().toISOString() })
    .eq('id', categoryId)
  if (error) log.error(`markCategoryScraped(${categoryId}): ${error.message}`)
}

export async function markCategoryFailed(db: DB, categoryId: string): Promise<void> {
  const { error } = await db
    .from('amazon_categories')
    .update({ scrape_status: 'failed' })
    .eq('id', categoryId)
  if (error) log.error(`markCategoryFailed(${categoryId}): ${error.message}`)
}
