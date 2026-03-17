/**
 * scrapers/amazon/cache.ts
 *
 * Amazon scrape cache — typed wrappers around shared NDJSON cache helpers.
 *
 * Each line is: { categoryId, products, edges }
 * Written atomically per-category during Phase 1.
 * Stream-read at Phase 2 start to rebuild allProducts + bestSellerEdges.
 */
import { initCache, appendCache, loadCache } from '../../shared/cache'
import { log } from '../../shared/logger'
import type { ScrapedProduct, CategoryRankRow } from './types'
import { AMAZON_CONFIG } from './config'

export interface AmazonCacheEntry {
    categoryId: string
    products: ScrapedProduct[]
    edges: CategoryRankRow[]
}

export const initScrapeCache = (): void =>
    initCache(AMAZON_CONFIG.scrape_cache_file)

export const appendScrapeCache = (entry: AmazonCacheEntry): void =>
    appendCache(AMAZON_CONFIG.scrape_cache_file, entry)

export async function loadScrapeCache(): Promise<{
    allProducts: Map<string, ScrapedProduct>
    bestSellerEdges: CategoryRankRow[]
    categoryCount: number
}> {
    const { entries, corrupted: _ } = await loadCache<AmazonCacheEntry>(AMAZON_CONFIG.scrape_cache_file)

    const allProducts = new Map<string, ScrapedProduct>()
    const bestSellerEdges: CategoryRankRow[] = []

    for (const entry of entries) {
        for (const p of entry.products) {
            if (!allProducts.has(p.asin)) allProducts.set(p.asin, p)
        }
        bestSellerEdges.push(...entry.edges)
    }

    log.success(`Cache loaded: ${allProducts.size} unique ASINs across ${entries.length} categories`)
    return { allProducts, bestSellerEdges, categoryCount: entries.length }
}
