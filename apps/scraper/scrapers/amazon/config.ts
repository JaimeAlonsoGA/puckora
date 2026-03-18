/**
 * scrapers/amazon/config.ts
 *
 * Amazon Best Sellers scraper configuration.
 * Extends BASE_CONFIG with SP-API credentials and Amazon-specific tunables.
 */
import { requireEnv, BASE_CONFIG } from '../../shared/config'

export const AMAZON_CONFIG = {
    ...BASE_CONFIG,

    // ── SP-API ────────────────────────────────────────────────────────────────
    sp_client_id: requireEnv('SP_CLIENT_ID'),
    sp_client_secret: requireEnv('SP_CLIENT_SECRET'),
    sp_refresh_token: requireEnv('SP_REFRESH_TOKEN'),
    sp_marketplace_id: process.env['SP_MARKETPLACE_ID'] || 'ATVPDKIKX0DER',

    // ── Marketplace ───────────────────────────────────────────────────────────
    marketplace: 'US',

    // ── Scraper delays (ms) ───────────────────────────────────────────────────
    // Polite pacing — with proxy we can afford slightly faster cadence.
    delay_min_ms: process.env['PROXY_URL'] ? 2_000 : 4_000,
    delay_max_ms: process.env['PROXY_URL'] ? 5_000 : 9_000,
    retry_max: 3,
    retry_delay_ms: 30_000,

    // ── SP-API rate control ───────────────────────────────────────────────────
    // getCatalogItem v2022-04-01: published rate 2 req/s, burst 2.
    // 700 ms gap (1.43 req/s) gives 28% headroom with zero burst risk.
    // Fees batch: 0.5 req/s limit → 2s sleep enforced inside @puckora/sp-api.
    spapi_delay_ms: 300,
    catalog_interval_ms: 700,
    spapi_retry_max: 3,
    spapi_retry_on_429_ms: 60_000,
    spapi_retry_on_503_ms: 120_000,

    // ── Persistence ───────────────────────────────────────────────────────────
    checkpoint_file: './runs/amazon/checkpoint.json',
    scrape_cache_file: './runs/amazon/cache.ndjson',
    batch_size: 50,

    // ── Batch mode ────────────────────────────────────────────────────────────
    // Phase 1 processes this many categories then exits 42 for resume.sh to restart.
    // 0 = no limit (default). Set via MAX_CATS_PER_RUN env var.
    max_cats_per_run: parseInt(process.env['MAX_CATS_PER_RUN'] ?? '0', 10) || 0,
} as const
