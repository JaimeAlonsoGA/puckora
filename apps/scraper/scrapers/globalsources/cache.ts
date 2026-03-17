/**
 * scrapers/globalsources/cache.ts
 *
 * GS scrape cache — typed wrappers around shared NDJSON cache helpers.
 * Uses scrape-cache-gs.ndjson — parallel-safe with the Amazon cache.
 *
 * Each line: { categoryUrl, categoryName, products: GlobalSourcesProductDetail[] }
 * Written per-category during Phase 1; used in test/upload-test round-trips.
 */
import { initCache, appendCache, loadCache } from '../../shared/cache'
import type { GlobalSourcesProductDetail } from '@puckora/scraper-core'
import { GS_CONFIG } from './config'

export interface GsCacheEntry {
    categoryUrl: string
    categoryName: string | undefined
    products: GlobalSourcesProductDetail[]
}

export const initScrapeCache = (): void =>
    initCache(GS_CONFIG.scrape_cache_file)

export const appendScrapeCache = (entry: GsCacheEntry): void =>
    appendCache(GS_CONFIG.scrape_cache_file, entry)

export const loadScrapeCache = (): Promise<{ entries: GsCacheEntry[]; corrupted: number }> =>
    loadCache<GsCacheEntry>(GS_CONFIG.scrape_cache_file)
