import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@puckora/types'
import { CONFIG } from '../config'

export type DB = SupabaseClient<Database>

/** Debug mode: log every row + timing for uploads. */
export const IS_DEBUG =
    process.argv.includes('--upload-test') || process.argv.includes('--test')

export function createDb(): DB {
    return createClient<Database>(CONFIG.supabase_url, CONFIG.supabase_key)
}
