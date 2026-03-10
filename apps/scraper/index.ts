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
import { scrapeCategory } from './scraper/category'
import { enrichAsin } from './scraper/enrich'
import { loadCategoriesFromSupabase, markCategoryScraped, markCategoryFailed } from './db/categories'
import { createDb } from './db/client'
import { upsertProducts, upsertRanks } from './db/products'
import { launchBrowser } from './browser'
import { getCatalogItem } from './sp-api/catalog'
import { getFeesEstimatesBatch } from './sp-api/fees'
import type { CatalogItemResult } from './sp-api/types'
import type { ProductRow, CategoryRankRow, ScrapedProduct, CategoryNode } from './types'
import { eta, dedupeByAsin, jitter } from './utils'

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
  }

  log.info(`Categories to scrape: ${categories.length}`)
  log.info(`Est. time (scrape only): ~${Math.round(categories.length * 6.5 / 3600)}h`)
  console.log()

  const start = new Date()
  const allProducts = new Map<string, ScrapedProduct>()   // asin → first-seen scraped data
  const bestSellerEdges: CategoryRankRow[] = []

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

      // Collect unique ASINs + best-seller edges
      const now = new Date().toISOString()
      for (const p of products) {
        if (!allProducts.has(p.asin)) allProducts.set(p.asin, p)
        bestSellerEdges.push({
          asin: p.asin,
          category_id: category.id,
          rank: p.rank,
          rank_type: 'best_seller',
          observed_at: now,
        })
      }

      if (!IS_TEST) await markCategoryScraped(db, category.id)
    }

    if ((scraped_ok + scraped_empty + scraped_fail) % 50 === 0 && !IS_TEST) saveCheckpoint(cp)
    await jitter()
  }

  await browser.close()

  const uniqueAsins = [...allProducts.keys()]
  log.success(`Scraping complete — ${scraped_ok} scraped | ${scraped_empty} empty | ${scraped_fail} failed | ${uniqueAsins.length} unique ASINs`)

  // ─── PHASE 2: ENRICH ───────────────────────────────────────────────────────

  log.section('Phase 2 — SP-API Enrichment', badge)

  const enrichedProducts: ProductRow[] = []
  const organicEdges: CategoryRankRow[] = []
  const failedEnrichmentAsins = new Set<string>()  // never attempt rank upsert for these

  let enriched_ok = 0, enriched_fail = 0

  // Skip already-enriched in resume mode
  const toEnrich = IS_RESUME && cp
    ? uniqueAsins.filter(a => !cp!.enriched_asins.includes(a) && !cp!.failed_asins.includes(a))
    : uniqueAsins

  log.info(`ASINs to enrich: ${toEnrich.length}`)
  if (IS_TEST) log.warn('SP-API calls ARE made in test mode — check your console output carefully')
  if (IS_UPLOAD_TEST) log.warn('UPLOAD-TEST — SP-API calls ARE made and results WILL be written to DB')
  console.log()

  // Phase 2a: Fetch all catalog items — 2 concurrent calls per batch
  // getCatalogItem rate limit is 5 req/s; 2 concurrent × ~300ms delay ≈ 3.6 req/s (safe headroom)
  const catalogMap = new Map<string, CatalogItemResult | null>()
  let catalog_ok = 0, catalog_fail = 0
  const enrichStart = new Date()
  const CATALOG_CONCURRENCY = 2
  for (let ci = 0; ci < toEnrich.length; ci += CATALOG_CONCURRENCY) {
    const batch = toEnrich.slice(ci, ci + CATALOG_CONCURRENCY)
    const enrichDone = catalog_ok + catalog_fail
    log.enrichPanel({
      done: enrichDone,
      total: toEnrich.length,
      ok: catalog_ok,
      fail: catalog_fail,
      etaStr: eta(enrichDone, toEnrich.length, enrichStart),
      label: batch[0],
    })
    await Promise.all(batch.map(async (asin) => {
      if (IS_TEST || IS_UPLOAD_TEST) log.api(`Enriching ${asin} — getCatalogItem`)
      try {
        catalogMap.set(asin, await getCatalogItem(asin))
        catalog_ok++
      } catch (err) {
        log.error(`Catalog fetch exception for ${asin}: ${(err as Error).message}`)
        catalogMap.set(asin, null)
        catalog_fail++
      }
    }))
  }

  // Phase 2b: Batch fee estimates — use catalog list_price, fall back to scraped price
  const asinsWithPrices = toEnrich
    .map(asin => ({
      asin,
      price: catalogMap.get(asin)?.list_price ?? allProducts.get(asin)!.price,
    }))
    .filter((x): x is { asin: string; price: number } => x.price !== null)
  log.info(`Pre-fetching fee estimates for ${asinsWithPrices.length} ASINs (${Math.ceil(asinsWithPrices.length / 20)} batch calls)...`)
  const feeMap = await getFeesEstimatesBatch(asinsWithPrices)
  console.log()

  // Phase 2c: Build product rows
  for (const asin of toEnrich) {
    const scraped = allProducts.get(asin)!
    const catalog = catalogMap.get(asin) ?? null

    try {
      const { product, ranks } = await enrichAsin(asin, scraped, catalog, feeMap.get(asin) ?? null)

      enrichedProducts.push(product)
      organicEdges.push(...ranks)

      if (product.scrape_status === 'enriched') {
        enriched_ok++
        cp.enriched_asins.push(asin)
      } else {
        enriched_fail++
        cp.failed_asins.push(asin)
      }

      if (IS_TEST || IS_UPLOAD_TEST) {
        const bsEdge = bestSellerEdges.find(e => e.asin === asin)
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

    if (!IS_TEST && (enriched_ok + enriched_fail) % 100 === 0) {
      // Flush to DB every 100 ASINs — keeps memory manageable.
      // NOTE: bestSellerEdges are NOT flushed here — they reference ALL scraped ASINs
      // and would violate the product_category_ranks → amazon_products FK constraint
      // for products not yet uploaded. They are flushed at the end when all products exist.
      const deduped = new Map<string, CategoryRankRow>()
      for (const e of organicEdges.splice(0)) {
        if (!failedEnrichmentAsins.has(e.asin)) deduped.set(`${e.asin}:${e.category_id}`, e)
      }
      await upsertProducts(db, enrichedProducts.splice(0))
      if (deduped.size > 0) await upsertRanks(db, [...deduped.values()])
      saveCheckpoint(cp)
      log.flush(enriched_ok, enriched_fail)
    }
  }

  // Final flush — always runs so bestSellerEdges are uploaded after all products exist in DB.
  // Gating on enrichedProducts.length would skip this when the total is divisible by 100.
  if (!IS_TEST) {
    if (enrichedProducts.length > 0) await upsertProducts(db, enrichedProducts)
    const deduped = new Map<string, CategoryRankRow>()
    for (const e of [...bestSellerEdges, ...organicEdges]) {
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
    organicEdges: organicEdges.length,
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
