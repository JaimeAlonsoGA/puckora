/**
 * shared/db.ts
 *
 * Single typed Supabase client factory for the entire scraper suite.
 * All scrapers share the same Supabase project/credentials.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@puckora/types'
import { BASE_CONFIG } from './config'

export type DB = SupabaseClient<Database>

export const IS_DEBUG =
    process.argv.includes('--upload-test') || process.argv.includes('--test')

export function createDb(): DB {
    return createClient<Database>(BASE_CONFIG.supabase_url, BASE_CONFIG.supabase_key)
}
