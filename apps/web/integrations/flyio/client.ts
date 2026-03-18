/**
 * Fly.io Postgres client — singleton Drizzle instance.
 *
 * Used for all tables that live on Fly.io Postgres:
 *   amazon_categories, amazon_products, product_category_ranks,
 *   amazon_keywords, amazon_keyword_products,
 *   gs_categories, gs_suppliers, gs_products.
 *
 * Tables that stay on Supabase (users, scrape_jobs) continue to use
 * the Supabase client from @/integrations/supabase/*.
 */
import { createDb, type PgDb } from '@puckora/db'

let _db: PgDb | null = null

export function createFlyioDb(): PgDb {
    if (!_db) {
        const url = process.env['DATABASE_URL']
        if (!url) throw new Error('DATABASE_URL is not set')
        _db = createDb(url)
    }
    return _db
}
