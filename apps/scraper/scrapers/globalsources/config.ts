/**
 * scrapers/globalsources/config.ts
 *
 * GlobalSources scraper configuration.
 * Does NOT require SP-API credentials — only Supabase for persistence.
 */
import { BASE_CONFIG } from '../../shared/config'

export const GS_CONFIG = {
    ...BASE_CONFIG,

    // ── Scraper behaviour ─────────────────────────────────────────────────────
    // Incapsula challenges resolve in ~5–10s. Conservative delays avoid rate limits.
    delay_min_ms: 3_000,
    delay_max_ms: 7_000,
    retry_max: 3,
    retry_delay_ms: 30_000,

    // GS is less aggressive than Amazon — 2 concurrent product detail workers is safe.
    product_concurrency: 2,

    // ── Category source ───────────────────────────────────────────────────────
    // Path to the categories JSON produced by tools/globalsources/scrape-categories.ts
    categories_file: './data/globalsources-categories.json',

    // ── Persistence ───────────────────────────────────────────────────────────
    checkpoint_file: './runs/globalsources/checkpoint.json',
    scrape_cache_file: './runs/globalsources/cache.ndjson',
    batch_size: 50,
} as const
