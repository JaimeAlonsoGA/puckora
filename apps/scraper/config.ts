import * as dotenv from 'dotenv'

// Loads .env from the current working directory (apps/scraper/.env).
// Run `npm run env:sync` from the repo root to regenerate from root .env.
dotenv.config()

function require_env(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing required env var: ${key}`)
  return v
}

export const CONFIG = {
  // Supabase
  supabase_url: require_env('NEXT_PUBLIC_SUPABASE_URL'),
  supabase_key: require_env('SUPABASE_SERVICE_ROLE_KEY'),

  // SP-API
  sp_client_id: require_env('SP_CLIENT_ID'),
  sp_client_secret: require_env('SP_CLIENT_SECRET'),
  sp_refresh_token: require_env('SP_REFRESH_TOKEN'),
  sp_marketplace_id: process.env['SP_MARKETPLACE_ID'] || 'ATVPDKIKX0DER',  // US default

  // Optional proxy
  proxy_url: process.env['PROXY_URL'] ?? '',

  // Marketplace
  marketplace: 'US',

  // Scraper delays (ms) — polite, avoids blocks
  delay_min: process.env['PROXY_URL'] ? 2_000 : 4_000,
  delay_max: process.env['PROXY_URL'] ? 5_000 : 9_000,
  retry_max: 3,
  retry_delay: 30_000,

  // SP-API rate control
  // getCatalogItem v2022-04-01: published rate 2 req/s, burst 2, but Retry-After: 60
  //   when throttled strongly suggests a per-minute quota, not just per-second.
  //   700 ms gap (1.43 req/s) gives 28 % headroom with zero burst risk.
  // Fees batch: 0.5 req/s limit → 2 s sleep enforced inside fees.ts.
  spapi_delay_ms: 300,
  catalog_interval_ms: 700,          // min ms between successive getCatalogItem fires
  spapi_retry_max: 3,
  spapi_retry_on_429_ms: 60_000,     // fallback — Retry-After header is always honoured first
  spapi_retry_on_503_ms: 120_000,

  // Persistence
  checkpoint_file: './checkpoint.json',
  scrape_cache_file: './scrape-cache.ndjson',
  batch_size: 50,
} as const
