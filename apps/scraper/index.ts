/**
 * Puckora — Amazon Best Sellers Scraper + SP-API Enrichment
 *
 * Usage:
 *   npx ts-node src/index.ts                     # full run
 *   npx ts-node src/index.ts --test 5            # log first 5 categories, no DB writes
 *   npx ts-node src/index.ts --resume            # continue from checkpoint
 *   npx ts-node src/index.ts --category 404809011
 */

import { CONFIG } from './config'
import { log } from './logger'
import { loadCheckpoint, saveCheckpoint, freshCheckpoint } from './checkpoint'
import { initScrapeCache, appendScrapeCache, loadScrapeCache } from './cache'
import { scrapeCategory } from './scraper/category'
import { enrichAsin } from './scraper/enrich'
import { loadCategoriesFromSupabase, markCategoryScraped, markCategoryFailed } from './db/categories'
import { createDb } from './db/client'
import { upsertProducts, upsertRanks } from './db/products'
import { launchBrowser } from './browser'
import { getCatalogItem } from './sp-api/catalog'
import { getFeesEstimatesBatch } from './sp-api/fees'
import { sleep } from './sp-api/client'
import type { CatalogItemResult } from './sp-api/types'
import type { ProductRow, CategoryRankRow, ScrapedProduct, CategoryNode } from './types'
import { eta, jitter } from './utils'

// ─── ARGS ────────────────────────────────────────────────────────────────────

const ARGS = process.argv.slice(2)
const IS_TEST = ARGS.includes('--test')
const IS_UPLOAD_TEST = ARGS.includes('--upload-test')
const IS_RESUME = ARGS.includes('--resume')
const TEST_LIMIT = IS_TEST ? parseInt(ARGS[ARGS.indexOf('--test') + 1] ?? '5') : null
const UPLOAD_TEST_LIMIT = IS_UPLOAD_TEST ? parseInt(ARGS[ARGS.indexOf('--upload-test') + 1] ?? '10') : null
const SINGLE_ID = ARGS.includes('--category') ? ARGS[ARGS.indexOf('--category') + 1] : null

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log()
  const runMode: 'full' | 'test' | 'upload-test' = IS_TEST ? 'test' : IS_UPLOAD_TEST ? 'upload-test' : 'full'
  const badge = IS_TEST ? 'TEST — no DB writes' : IS_UPLOAD_TEST ? 'UPLOAD-TEST' : undefined
  log.section('Puckora — Best Sellers Scraper v2', badge)

  // Validate env
  try {
    const { CONFIG: _ } = await import('./config')
  } catch (e) {
    log.error((e as Error).message)
    process.exit(1)
  }

  const db = createDb()
  const browser = await launchBrowser()
  log.info(CONFIG.proxy_url ? `Proxy: ${CONFIG.proxy_url.replace(/:[^:@]+@/, ':***@')}` : 'No proxy — using local IP')

  // Load categories
  let categories: CategoryNode[]
  try {
    categories = await loadCategoriesFromSupabase(db, { singleId: SINGLE_ID ?? undefined })
    log.success(`Loaded ${categories.length} categories from Supabase`)
  } catch (e) {
    log.error((e as Error).message)
    await browser.close()
    process.exit(1)
  }

  if (TEST_LIMIT) categories = categories.slice(0, TEST_LIMIT)
  if (UPLOAD_TEST_LIMIT) categories = categories.slice(0, UPLOAD_TEST_LIMIT)
  if (SINGLE_ID) categories = categories.filter(c => c.id === SINGLE_ID)

  // Checkpoint
  let cp = loadCheckpoint()
  if (IS_RESUME && cp) {
    const done = new Set(cp.scraped_ids)
    const before = categories.length
    categories = categories.filter(c => !done.has(c.id))
    log.info(`Resuming — skipping ${before - categories.length} already scraped`)
  } else {
    cp = freshCheckpoint()
    if (!IS_TEST) initScrapeCache()   // clear cache on fresh run; test mode is in-memory only
  }

  log.info(`Categories to scrape: ${categories.length}`)
  log.info(`Est. time (scrape only): ~${Math.round(categories.length * 6.5 / 3600)}h`)
  console.log()

  const start = new Date()
  // allProducts and bestSellerEdges are NOT kept in memory during Phase 1.
  // They are written to the scrape cache (NDJSON) per category and loaded
  // back from disk before Phase 2 starts. This keeps Phase 1 heap stable
  // regardless of how many categories are scraped.

  // ─── PHASE 1: SCRAPE ───────────────────────────────────────────────────────

  log.section('Phase 1 — Scraping Best Sellers Pages', badge)

  let scraped_ok = 0, scraped_empty = 0, scraped_fail = 0
  const scrapeProductCounts: number[] = []
  const calcMedian = (arr: number[]): number | null => {
    if (arr.length === 0) return null
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
  }

  for (const category of categories) {
    const done = scraped_ok + scraped_empty + scraped_fail
    log.scrapePanel({
      done,
      total: categories.length,
      ok: scraped_ok,
      empty: scraped_empty,
      fail: scraped_fail,
      etaStr: eta(done, categories.length, start),
      medianProducts: calcMedian(scrapeProductCounts),
      label: category.name,
    })

    const products = await scrapeCategory(browser, category)

    if (products === null) {
      scraped_fail++
      cp.failed_scrapes.push(category.id)
      if (!IS_TEST) await markCategoryFailed(db, category.id)
    } else if (products.length === 0) {
      // Genuinely no Best Sellers — mark scraped so it isn't retried next run
      scraped_empty++
      cp.scraped_ids.push(category.id)
      if (!IS_TEST) await markCategoryScraped(db, category.id)
    } else {
      scraped_ok++
      scrapeProductCounts.push(products.length)
      cp.scraped_ids.push(category.id)

      const totalBadges: number | undefined = (products as any)._totalBadges
      log.scrape(category.id, category.name, category.full_path, products.length, totalBadges)

      // Persist scraped data to disk — no in-memory accumulation during Phase 1.
      // This keeps heap stable; allProducts + bestSellerEdges are rebuilt from the
      // cache file at Phase 2 start via loadScrapeCache().
      if (!IS_TEST) {
        const now = new Date().toISOString()
        const edges = products.map(p => ({
          asin: p.asin,
          category_id: category.id,
          rank: p.rank,
          rank_type: 'best_seller' as const,
          observed_at: now,
        }))
        appendScrapeCache({ categoryId: category.id, products, edges })
      }

      if (!IS_TEST) await markCategoryScraped(db, category.id)
    }

    if ((scraped_ok + scraped_empty + scraped_fail) % 50 === 0 && !IS_TEST) saveCheckpoint(cp)
    await jitter()
  }

  await browser.close()

  // Load scraped data from disk — this is the Phase 1 → Phase 2 handoff.
  // In test mode allProducts is empty (no cache writes); Phase 2 is still exercised for
  // upload-test mode which does write to the cache.
  const { allProducts, bestSellerEdges } = IS_TEST
    ? { allProducts: new Map<string, ScrapedProduct>(), bestSellerEdges: [] as CategoryRankRow[] }
    : await loadScrapeCache()

  const uniqueAsins = [...allProducts.keys()]
  log.success(`Scraping complete — ${scraped_ok} scraped | ${scraped_empty} empty | ${scraped_fail} failed | ${uniqueAsins.length} unique ASINs`)

  // ─── PHASE 2: ENRICH ───────────────────────────────────────────────────────

  log.section('Phase 2 — SP-API Enrichment', badge)

  // Streaming Phase 2: catalog + fees + enrich in per-20 batches.
  // Processing 20 ASINs at a time (the fee-estimate API batch limit) means
  // catalogMap and feeMap are never larger than 20 entries — eliminating the
  // O(N) memory accumulation of the previous 3-pass approach.
  //
  // Best-seller edges are flushed incrementally alongside their products
  // (after products exist in DB, FK is satisfied).  Organic (SP-API salesRank)
  // edges are flushed in the same batch.  The final flush handles any remainder.

  // Index best-seller edges by ASIN for O(1) lookup during the loop.
  const bestSellerEdgesByAsin = new Map<string, CategoryRankRow[]>()
  for (const edge of bestSellerEdges) {
    const arr = bestSellerEdgesByAsin.get(edge.asin)
    if (arr) arr.push(edge)
    else bestSellerEdgesByAsin.set(edge.asin, [edge])
  }

  const enrichedProducts: ProductRow[] = []
  const pendingRanks: CategoryRankRow[] = []
  const failedEnrichmentAsins = new Set<string>()

  let enriched_ok = 0, enriched_fail = 0
  let catalog_ok = 0, catalog_fail = 0
  let totalOrganicEdges = 0
  const enrichStart = new Date()

  // Skip already-enriched in resume mode.
  // Use Sets for O(1) lookup — cp.enriched_asins can have 500k+ entries on a late-stage resume,
  // and array.includes() would be O(N²) over the full ASIN list.
  const alreadyEnriched = new Set(cp?.enriched_asins ?? [])
  const alreadyFailed = new Set(cp?.failed_asins ?? [])
  const toEnrich = IS_RESUME && cp
    ? uniqueAsins.filter(a => !alreadyEnriched.has(a) && !alreadyFailed.has(a))
    : uniqueAsins

  log.info(`ASINs to enrich: ${toEnrich.length}`)
  if (IS_TEST) log.warn('SP-API calls ARE made in test mode — check your console output carefully')
  if (IS_UPLOAD_TEST) log.warn('UPLOAD-TEST — SP-API calls ARE made and results WILL be written to DB')
  console.log()

  // getCatalogItem rate limit is 5 req/s; 2 concurrent × ~300ms internal sleep ≈ 3.6 req/s.
  // Fee-estimate batch limit is 20 items; rate limit is 0.5 req/s (2s minimum sleep enforced internally).
  // Outer batch size = 20 (fee limit); catalog runs 2-concurrent pairs within each outer batch.
  const ENRICH_BATCH = 20
  const FLUSH_EVERY = 100

  for (let bi = 0; bi < toEnrich.length; bi += ENRICH_BATCH) {
    const batch = toEnrich.slice(bi, bi + ENRICH_BATCH)

    const enrichDone = catalog_ok + catalog_fail
    log.enrichPanel({
      done: enrichDone,
      total: toEnrich.length,
      ok: catalog_ok,
      fail: catalog_fail,
      etaStr: eta(enrichDone, toEnrich.length, enrichStart),
      label: batch[0],
    })

    // ── 2a: Catalog items — corrected fire-time scheduling ────────────────────
    // `nextFireAt` tracks when the NEXT call *should* fire (fire time + interval).
    // In normal operation this gives exact start-to-start spacing — same throughput
    // as before. If getCatalogItem internally retries (60 s wait), the call returns
    // AFTER nextFireAt has already passed, so we reset it to now + interval.
    // This prevents the old bug where a stale lastCatalogFire caused the next call
    // to fire immediately after a retry, creating a burst that retriggered 429.
    const catalogBatch = new Map<string, CatalogItemResult | null>()
    let nextFireAt = 0
    for (const asin of batch) {
      const wait = nextFireAt - Date.now()
      if (wait > 0) await sleep(wait)
      // Schedule next fire from NOW (before the call), preserving start-to-start interval
      nextFireAt = Date.now() + CONFIG.catalog_interval_ms
      if (IS_TEST || IS_UPLOAD_TEST) log.api(`Enriching ${asin} — getCatalogItem`)
      try {
        catalogBatch.set(asin, await getCatalogItem(asin))
        catalog_ok++
      } catch (err) {
        log.error(`Catalog fetch exception for ${asin}: ${(err as Error).message}`)
        catalogBatch.set(asin, null)
        catalog_fail++
      }
      // If the call took longer than the interval (retry happened), nextFireAt is in the past.
      // Reset it so the next call fires after a full fresh interval, not immediately.
      if (Date.now() > nextFireAt) {
        nextFireAt = Date.now() + CONFIG.catalog_interval_ms
      }
    }

    // ── 2b: Fee estimates for this batch ──────────────────────────────────────
    const batchPriced = batch
      .map(asin => ({
        asin,
        price: catalogBatch.get(asin)?.list_price ?? allProducts.get(asin)!.price,
      }))
      .filter((x): x is { asin: string; price: number } => x.price !== null)
    const feeBatch = await getFeesEstimatesBatch(batchPriced)

    // ── 2c: Enrich each ASIN in batch ─────────────────────────────────────────
    for (const asin of batch) {
      const scraped = allProducts.get(asin)!
      const catalog = catalogBatch.get(asin) ?? null

      try {
        const { product, ranks } = enrichAsin(asin, scraped, catalog, feeBatch.get(asin) ?? null)

        enrichedProducts.push(product)
        pendingRanks.push(...ranks)           // organic ranks
        totalOrganicEdges += ranks.length

        // Best-seller edges are safe to flush once the product row exists in DB.
        // We add them here so they're included in the next per-100 flush.
        if (!failedEnrichmentAsins.has(asin)) {
          pendingRanks.push(...(bestSellerEdgesByAsin.get(asin) ?? []))
        }

        if (product.scrape_status === 'enriched') {
          enriched_ok++
          cp.enriched_asins.push(asin)
        } else {
          enriched_fail++
          cp.failed_asins.push(asin)
        }

        if (IS_TEST || IS_UPLOAD_TEST) {
          const bsEdge = bestSellerEdgesByAsin.get(asin)?.[0]
          const cat = categories.find(c => c.id === bsEdge?.category_id)
          log.enrichCardVerbose({
            asin,
            bsRank: bsEdge?.rank ?? 0,
            categoryId: bsEdge?.category_id ?? 'unknown',
            categoryPath: cat?.full_path ?? cat?.name ?? '',
            // scraped
            scrapedName: scraped.name,
            scrapedPrice: scraped.price,
            rating: product.rating ?? null,
            reviewCount: product.review_count ?? null,
            productUrl: scraped.product_url,
            // SP-API catalog
            title: product.title ?? null,
            brand: product.brand ?? null,
            manufacturer: product.manufacturer ?? null,
            modelNumber: product.model_number ?? null,
            color: product.color ?? null,
            packageQuantity: product.package_quantity ?? null,
            productType: product.product_type ?? null,
            browseNodeId: product.browse_node_id ?? null,
            listingDate: catalog?.listing_date ?? null,
            bulletPoints: catalog?.bullet_points ?? [],
            // dims
            itemL: product.item_length_cm ?? null,
            itemW: product.item_width_cm ?? null,
            itemH: product.item_height_cm ?? null,
            itemWt: product.item_weight_kg ?? null,
            pkgL: product.pkg_length_cm ?? null,
            pkgW: product.pkg_width_cm ?? null,
            pkgH: product.pkg_height_cm ?? null,
            pkgWt: product.pkg_weight_kg ?? null,
            // fees
            spApiPrice: catalog?.list_price ?? null,
            fbaFee: product.fba_fee ?? null,
            referralFee: product.referral_fee ?? null,
            // ranks
            organicRanks: ranks,
            status: product.scrape_status,
          })
        }

      } catch (err) {
        enriched_fail++
        failedEnrichmentAsins.add(asin)
        cp.failed_asins.push(asin)
        log.error(`Enrichment exception for ${asin}: ${(err as Error).message}`)
      }
    }

    // ── Periodic flush every FLUSH_EVERY enriched ASINs ──────────────────────
    if (!IS_TEST && enrichedProducts.length >= FLUSH_EVERY) {
      const deduped = new Map<string, CategoryRankRow>()
      for (const e of pendingRanks.splice(0)) {
        if (!failedEnrichmentAsins.has(e.asin)) deduped.set(`${e.asin}:${e.category_id}`, e)
      }
      await upsertProducts(db, enrichedProducts.splice(0))
      if (deduped.size > 0) await upsertRanks(db, [...deduped.values()])
      saveCheckpoint(cp)
      log.flush(enriched_ok, enriched_fail)
    }
  }

  // Final flush — uploads the remaining buffer (< FLUSH_EVERY products).
  if (!IS_TEST) {
    if (enrichedProducts.length > 0) await upsertProducts(db, enrichedProducts)
    const deduped = new Map<string, CategoryRankRow>()
    for (const e of pendingRanks) {
      if (!failedEnrichmentAsins.has(e.asin)) deduped.set(`${e.asin}:${e.category_id}`, e)
    }
    if (deduped.size > 0) await upsertRanks(db, [...deduped.values()])
    saveCheckpoint(cp)
  }

  // ─── SUMMARY ───────────────────────────────────────────────────────────────

  log.section('Summary')
  log.summary({
    scrapedOk: scraped_ok,
    scrapedEmpty: scraped_empty,
    scrapedFail: scraped_fail,
    uniqueAsins: uniqueAsins.length,
    enrichedOk: enriched_ok,
    enrichedFail: enriched_fail,
    bestSellerEdges: bestSellerEdges.length,
    organicEdges: totalOrganicEdges,
    elapsedMs: Date.now() - start.getTime(),
    medianProducts: calcMedian(scrapeProductCounts),
  }, runMode)
}

// ─── GRACEFUL SHUTDOWN ───────────────────────────────────────────────────────

process.on('SIGINT', () => {
  log.warn('\nInterrupted — checkpoint saved. Run with --resume to continue.')
  process.exit(0)
})

main().catch(err => {
  log.error(`Fatal: ${(err as Error).message}`)
  console.error(err)
  process.exit(1)
})
