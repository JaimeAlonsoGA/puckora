/**
 * Puckora — Amazon Best Sellers Scraper + SP-API Enrichment
 *
 * Usage:
 *   npx ts-node src/index.ts                     # full run
 *   npx ts-node src/index.ts --test 5            # log first 5 categories, no DB writes
 *   npx ts-node src/index.ts --resume            # continue from checkpoint
 *   npx ts-node src/index.ts --category 404809011
 */

import { chromium } from 'playwright'
import { CONFIG } from './config'
import { log } from './logger'
import { loadCheckpoint, saveCheckpoint, freshCheckpoint } from './checkpoint'
import { scrapeCategory, loadCategoriesFromSupabase, jitter } from './scraper'
import { launchBrowser } from './browser'
import { getCatalogItem, getFeesEstimatesBatch } from './spapi'
import { createDb, upsertProducts, upsertRanks, markCategoryScraped, markCategoryFailed } from './db'
import { ProductRow, CategoryRankRow, ScrapedProduct, CategoryNode, FeeEstimateResult, CatalogItemResult } from './types'
import { eta, dedupeByAsin } from './utils'

// ─── ARGS ────────────────────────────────────────────────────────────────────

const ARGS = process.argv.slice(2)
const IS_TEST = ARGS.includes('--test')
const IS_UPLOAD_TEST = ARGS.includes('--upload-test')
const IS_RESUME = ARGS.includes('--resume')
const TEST_LIMIT = IS_TEST ? parseInt(ARGS[ARGS.indexOf('--test') + 1] ?? '5') : null
const UPLOAD_TEST_LIMIT = IS_UPLOAD_TEST ? parseInt(ARGS[ARGS.indexOf('--upload-test') + 1] ?? '10') : null
const SINGLE_ID = ARGS.includes('--category') ? ARGS[ARGS.indexOf('--category') + 1] : null

// ─── ENRICH ONE ASIN ─────────────────────────────────────────────────────────

async function enrichAsin(
  asin: string,
  scraped: ScrapedProduct,
  catalog: CatalogItemResult | null,
  feeResult: FeeEstimateResult | null,
): Promise<{ product: ProductRow; ranks: CategoryRankRow[] }> {

  const now = new Date().toISOString()

  const product: ProductRow = {
    // From scraper
    asin,
    price: catalog?.list_price ?? scraped.price,
    rating: scraped.rating,
    review_count: scraped.review_count,
    product_url: scraped.product_url,

    // From SP-API (null if enrichment failed)
    title: catalog?.title ?? scraped.name,  // fallback to scraped name
    brand: catalog?.brand ?? null,
    manufacturer: catalog?.manufacturer ?? null,
    model_number: catalog?.model_number ?? null,
    package_quantity: catalog?.package_quantity ?? null,
    color: catalog?.color ?? null,
    main_image_url: catalog?.main_image_url ?? null,
    bullet_points: catalog?.bullet_points ?? [],
    product_type: catalog?.product_type ?? null,
    browse_node_id: catalog?.browse_node_id ?? null,
    item_length_cm: catalog?.item_length_cm ?? null,
    item_width_cm: catalog?.item_width_cm ?? null,
    item_height_cm: catalog?.item_height_cm ?? null,
    item_weight_kg: catalog?.item_weight_kg ?? null,
    pkg_length_cm: catalog?.pkg_length_cm ?? null,
    pkg_width_cm: catalog?.pkg_width_cm ?? null,
    pkg_height_cm: catalog?.pkg_height_cm ?? null,
    pkg_weight_kg: catalog?.pkg_weight_kg ?? null,

    fba_fee: feeResult?.fba_fee ?? null,
    referral_fee: feeResult?.referral_fee ?? null,

    scrape_status: catalog ? 'enriched' : 'enrichment_failed',
    enriched_at: now,
  }

  // Organic ranks from SP-API salesRanks — these are ALL categories this ASIN ranks in
  const ranks: CategoryRankRow[] = (catalog?.category_ranks ?? []).map(r => ({
    asin,
    category_id: r.classificationId,
    rank: r.rank,
    rank_type: 'organic' as const,
    observed_at: now,
  }))

  return { product, ranks }
}

// ─── TEST MODE LOGGER ────────────────────────────────────────────────────────

function logProductFull(product: ProductRow, bestSellerRank: number, categoryId: string, organicRanks: CategoryRankRow[]) {
  log.product(`PRODUCT — ${product.asin}`, {
    '── SCRAPED ──': '',
    'Best Seller Rank': `#${bestSellerRank} in ${categoryId}`,
    'Scraped Name': product.title ?? '(no title)',
    'Price': product.price !== null ? `$${product.price}` : null,
    'Rating': product.rating !== null ? `${product.rating} / 5` : null,
    'Review Count': product.review_count?.toLocaleString() ?? null,
    'Product URL': product.product_url,

    '── SP-API ──': '',
    'Title (SP-API)': product.title,
    'Brand': product.brand,
    'Manufacturer': product.manufacturer,
    'Model Number': product.model_number,
    'Package Quantity': product.package_quantity,
    'Color': product.color,
    'Main Image URL': product.main_image_url,
    'Bullet Points': product.bullet_points,
    'Product Type': product.product_type,
    'Browse Node ID': product.browse_node_id,
    '── DIMENSIONS ──': '',
    'Item L × W × H (cm)': product.item_length_cm !== null
      ? `${product.item_length_cm} × ${product.item_width_cm} × ${product.item_height_cm}`
      : null,
    'Item Weight (kg)': product.item_weight_kg,
    'Package L × W × H (cm)': product.pkg_length_cm !== null
      ? `${product.pkg_length_cm} × ${product.pkg_width_cm} × ${product.pkg_height_cm}`
      : null,
    'Package Weight (kg)': product.pkg_weight_kg,

    '── FEES ──': '',
    'FBA Fulfillment Fee': product.fba_fee !== null ? `$${product.fba_fee}` : null,
    'Referral Fee': product.referral_fee !== null ? `$${product.referral_fee}` : null,

    '── STATUS ──': '',
    'Scrape Status': product.scrape_status,
    'Enriched At': product.enriched_at,
  })

  if (organicRanks.length > 0) {
    console.log(`\n    ${'ORGANIC CATEGORY RANKS'.padEnd(30)} (${organicRanks.length} total from SP-API)`)
    organicRanks.slice(0, 10).forEach(r => {
      log.edge(r.asin, r.category_id, r.rank, r.rank_type)
    })
    if (organicRanks.length > 10) console.log(`    ... and ${organicRanks.length - 10} more`)
  } else {
    console.log(`\n    No organic ranks returned from SP-API`)
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log()
  log.section('Puckora — Best Sellers Scraper v2')

  if (IS_TEST) {
    log.warn(`TEST MODE — scraping ${TEST_LIMIT} categories, no DB writes, full console output`)
  }
  if (IS_UPLOAD_TEST) {
    log.warn(`UPLOAD-TEST MODE — scraping ${UPLOAD_TEST_LIMIT} categories, DB writes ON, full console output`)
  }

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

  log.section('Phase 1 — Scraping Best Sellers Pages')

  let scraped_ok = 0, scraped_fail = 0

  for (const category of categories) {
    log.progress(scraped_ok + scraped_fail, categories.length, scraped_ok, scraped_fail, eta(scraped_ok + scraped_fail, categories.length, start))

    const products = await scrapeCategory(browser, category)

    if (!products || products.length === 0) {
      scraped_fail++
      cp.failed_scrapes.push(category.id)
      if (!IS_TEST) await markCategoryFailed(db, category.id)
    } else {
      scraped_ok++
      cp.scraped_ids.push(category.id)

      if (IS_TEST || IS_UPLOAD_TEST) {
        log.success(`\n  Category ${category.id} (${category.name}) — ${products.length} products scraped`)
      }

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

    if ((scraped_ok + scraped_fail) % 50 === 0 && !IS_TEST) saveCheckpoint(cp)
    await jitter()
  }

  await browser.close()
  process.stdout.write('\n')

  const uniqueAsins = [...allProducts.keys()]
  log.success(`Scraping complete — ${scraped_ok} categories | ${uniqueAsins.length} unique ASINs | ${scraped_fail} failed`)

  // ─── PHASE 2: ENRICH ───────────────────────────────────────────────────────

  log.section('Phase 2 — SP-API Enrichment')

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

  // Phase 2a: Fetch all catalog items first
  const catalogMap = new Map<string, CatalogItemResult | null>()
  for (const asin of toEnrich) {
    log.api(`Enriching ${asin} — getCatalogItem`)
    try {
      catalogMap.set(asin, await getCatalogItem(asin))
    } catch (err) {
      log.error(`Catalog fetch exception for ${asin}: ${(err as Error).message}`)
      catalogMap.set(asin, null)
    }
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
        // Find this product's best-seller rank in the category it was discovered in
        const bsEdge = bestSellerEdges.find(e => e.asin === asin)
        logProductFull(
          product,
          bsEdge?.rank ?? 0,
          bsEdge?.category_id ?? 'unknown',
          ranks
        )
      }

    } catch (err) {
      enriched_fail++
      failedEnrichmentAsins.add(asin)
      cp.failed_asins.push(asin)
      log.error(`Enrichment exception for ${asin}: ${(err as Error).message}`)
    }

    if (!IS_TEST && (enriched_ok + enriched_fail) % 100 === 0) {
      // Flush to DB every 100 ASINs — keeps memory manageable
      const deduped = new Map<string, CategoryRankRow>()
      for (const e of [...bestSellerEdges.splice(0), ...organicEdges.splice(0)]) {
        if (!failedEnrichmentAsins.has(e.asin)) deduped.set(`${e.asin}:${e.category_id}`, e)
      }
      await upsertProducts(db, enrichedProducts.splice(0))
      await upsertRanks(db, [...deduped.values()])
      saveCheckpoint(cp)
      log.info(`Flushed to DB — enriched: ${enriched_ok} | failed: ${enriched_fail}`)
    }
  }

  // Final flush
  if (!IS_TEST && enrichedProducts.length > 0) {
    await upsertProducts(db, enrichedProducts)
    const deduped = new Map<string, CategoryRankRow>()
    for (const e of [...bestSellerEdges, ...organicEdges]) {
      if (!failedEnrichmentAsins.has(e.asin)) deduped.set(`${e.asin}:${e.category_id}`, e)
    }
    await upsertRanks(db, [...deduped.values()])
    saveCheckpoint(cp)
  }

  // ─── SUMMARY ───────────────────────────────────────────────────────────────

  log.section('Summary')

  if (IS_TEST) {
    log.raw('  ┌─────────────────────────────────────────────┐')
    log.raw(`  │  Categories scraped:    ${String(scraped_ok).padStart(6)}              │`)
    log.raw(`  │  Categories failed:     ${String(scraped_fail).padStart(6)}              │`)
    log.raw(`  │  Unique ASINs found:    ${String(uniqueAsins.length).padStart(6)}              │`)
    log.raw(`  │  ASINs enriched (ok):   ${String(enriched_ok).padStart(6)}              │`)
    log.raw(`  │  ASINs enriched (fail): ${String(enriched_fail).padStart(6)}              │`)
    log.raw(`  │  Best seller edges:     ${String(bestSellerEdges.length).padStart(6)}              │`)
    log.raw(`  │  Organic edges (total): ${String(organicEdges.length).padStart(6)}              │`)
    log.raw('  │                                             │')
    log.raw('  │  ✓ No DB writes — test mode                │')
    log.raw('  └─────────────────────────────────────────────┘')
  } else if (IS_UPLOAD_TEST) {
    log.raw('  ┌─────────────────────────────────────────────┐')
    log.raw(`  │  Categories scraped:    ${String(scraped_ok).padStart(6)}              │`)
    log.raw(`  │  Categories failed:     ${String(scraped_fail).padStart(6)}              │`)
    log.raw(`  │  Unique ASINs found:    ${String(uniqueAsins.length).padStart(6)}              │`)
    log.raw(`  │  ASINs enriched (ok):   ${String(enriched_ok).padStart(6)}              │`)
    log.raw(`  │  ASINs enriched (fail): ${String(enriched_fail).padStart(6)}              │`)
    log.raw(`  │  Best seller edges:     ${String(bestSellerEdges.length).padStart(6)}              │`)
    log.raw(`  │  Organic edges (total): ${String(organicEdges.length).padStart(6)}              │`)
    log.raw('  │                                             │')
    log.raw('  │  ✓ DB writes — upload-test mode            │')
    log.raw('  └─────────────────────────────────────────────┘')
  } else {
    log.raw(`  Categories scraped:    ${scraped_ok} ok / ${scraped_fail} failed`)
    log.raw(`  Unique ASINs:          ${uniqueAsins.length}`)
    log.raw(`  Enriched:              ${enriched_ok} ok / ${enriched_fail} failed`)
    log.raw(`  Best seller edges:     ${bestSellerEdges.length}`)
    log.raw(`  Organic rank edges:    ${organicEdges.length}`)
    if (enriched_fail > 0 || scraped_fail > 0) {
      log.raw(`\n  Run with --resume to retry ${scraped_fail + enriched_fail} failed items`)
    }
  }
  log.raw('')
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
