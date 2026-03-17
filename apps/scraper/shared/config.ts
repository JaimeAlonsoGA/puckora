/**
 * shared/config.ts
 *
 * Base environment config shared by every scraper in the suite.
 * Each scraper extends this with its own fields in its own config.ts.
 *
 * Env is loaded from apps/scraper/.env.
 * Run `npm run env:sync` from the repo root to regenerate from root .env.
 */
import * as dotenv from 'dotenv'
dotenv.config()

export function requireEnv(key: string): string {
    const v = process.env[key]
    if (!v) throw new Error(`Missing required env var: ${key}`)
    return v
}

export const BASE_CONFIG = {
    supabase_url: requireEnv('SUPABASE_URL'),
    supabase_key: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    proxy_url: process.env['PROXY_URL'] ?? '',
} as const
