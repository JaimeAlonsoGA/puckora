/**
 * Scrape cache — append-only NDJSON persistence for Phase 1 scraped data.
 *
 * Each line is one category entry: { categoryId, products, edges }.
 * Written atomically per-category so a crash loses at most the in-progress
 * category. On --resume, loadScrapeCache() rebuilds allProducts + bestSellerEdges
 * from disk so Phase 2 can proceed even after a Phase 1 OOM.
 */

import { appendFileSync, existsSync, writeFileSync, createReadStream } from 'fs'
import { createInterface } from 'readline'
import { log } from './logger'
import type { ScrapedProduct, CategoryRankRow } from './types'
import { CONFIG } from './config'

interface ScrapeEntry {
  categoryId: string
  products: ScrapedProduct[]
  edges: CategoryRankRow[]
}

/** Clear the cache at the start of a fresh (non-resume) run. */
export function initScrapeCache(): void {
  writeFileSync(CONFIG.scrape_cache_file, '', 'utf-8')
  log.info(`Scrape cache cleared: ${CONFIG.scrape_cache_file}`)
}

/**
 * Append one category's scraped data to the cache.
 * Uses appendFileSync so each write is atomic at the OS level — a crash
 * mid-write at most corrupts the last (incomplete) line, which loadScrapeCache
 * silently skips.
 */
export function appendScrapeCache(entry: ScrapeEntry): void {
  appendFileSync(CONFIG.scrape_cache_file, JSON.stringify(entry) + '\n', 'utf-8')
}

/**
 * Read the full cache line-by-line (streaming) and rebuild allProducts + bestSellerEdges.
 * Streaming avoids a ~2-3 GB peak allocation that readFileSync would cause for a full
 * 30k-category run (~1.2 GB file). Corrupted lines (crash mid-write) are silently skipped.
 */
export async function loadScrapeCache(): Promise<{
  allProducts: Map<string, ScrapedProduct>
  bestSellerEdges: CategoryRankRow[]
  categoryCount: number
}> {
  const allProducts = new Map<string, ScrapedProduct>()
  const bestSellerEdges: CategoryRankRow[] = []
  let categoryCount = 0
  let corrupted = 0

  if (!existsSync(CONFIG.scrape_cache_file)) {
    log.warn(`Scrape cache not found: ${CONFIG.scrape_cache_file}`)
    return { allProducts, bestSellerEdges, categoryCount }
  }

  log.info(`Loading scrape cache from ${CONFIG.scrape_cache_file} …`)

  const rl = createInterface({
    input: createReadStream(CONFIG.scrape_cache_file, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (!line.trim()) continue
    try {
      const entry: ScrapeEntry = JSON.parse(line)
      for (const p of entry.products) {
        if (!allProducts.has(p.asin)) allProducts.set(p.asin, p)
      }
      bestSellerEdges.push(...entry.edges)
      categoryCount++
    } catch {
      // Truncated line from a crash mid-write — skip
      corrupted++
    }
  }

  if (corrupted > 0) log.warn(`Cache: ${corrupted} corrupted line(s) skipped`)
  log.success(
    `Cache loaded — ${categoryCount} categories · ${allProducts.size} unique ASINs · ${bestSellerEdges.length} best-seller edges`,
  )

  return { allProducts, bestSellerEdges, categoryCount }
}
