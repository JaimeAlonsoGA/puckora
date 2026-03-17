/**
 * scrapers/amazon/index.ts
 *
 * Amazon Best Sellers Scraper + SP-API Enrichment
 *
 * Two-phase pipeline:
 *   Phase 1 — Scrape Best Sellers pages → NDJSON cache (heap-stable)
 *   Phase 2 — SP-API catalog + fees → upsert products + rank edges
 *
 * Modes:
 *   (default)         full production run
 *   --test N          scrape N categories, no DB writes, log to test-run.log
 *   --upload-test N   scrape N categories, writes to DB, log to upload-test.log
 *   --resume          skip already-scraped categories and enriched ASINs
 *   --category ID     run a single category by node ID
 */
import { AMAZON_CONFIG } from './config'
import { log } from '../../shared/logger'
import { loadCheckpoint, saveCheckpoint, freshCheckpoint } from './checkpoint'
import { initScrapeCache, appendScrapeCache, loadScrapeCache } from './cache'
import { scrapeCategory } from './pages/category'
import { loadCategoriesFromSupabase, markCategoryScraped, markCategoryFailed } from './db/categories'
import { createDb } from '../../shared/db'
import { upsertProducts, upsertRanks } from './db/products'
import { launchBrowser } from './browser'
import { enrichAsin, getCatalogItemParsed as getCatalogItem, getFeesEstimatesBatch, sleep } from '@puckora/sp-api'
import type { CatalogItemResult } from '@puckora/sp-api'
import type { ProductRow, CategoryRankRow, ScrapedProduct, CategoryNode } from './types'
import { eta, jitter } from '../../shared/utils'
import { parseScraperArgs } from '../../shared/cli'

// ─── ARGS ────────────────────────────────────────────────────────────────────

const { IS_TEST, IS_UPLOAD_TEST, IS_RESUME, TEST_LIMIT, UPLOAD_TEST_LIMIT, SINGLE_ID } = parseScraperArgs()

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
    console.log()
    const runMode: 'full' | 'test' | 'upload-test' = IS_TEST ? 'test' : IS_UPLOAD_TEST ? 'upload-test' : 'full'
    const badge = IS_TEST ? 'TEST — no DB writes' : IS_UPLOAD_TEST ? 'UPLOAD-TEST' : undefined
    log.section('Puckora — Best Sellers Scraper v2', badge)

    const db = createDb()
    const browser = await launchBrowser()
    log.info(AMAZON_CONFIG.proxy_url ? `Proxy: ${AMAZON_CONFIG.proxy_url.replace(/:[^:@]+@/, ':***@')}` : 'No proxy — using local IP')

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

    // Checkpoint / resume
    let cp = loadCheckpoint()
    if (IS_RESUME && cp) {
        const done = new Set(cp.scraped_ids)
        const before = categories.length
        categories = categories.filter(c => !done.has(c.id))
        log.info(`Resuming — skipping ${before - categories.length} already scraped`)
    } else {
        cp = freshCheckpoint()
        if (!IS_TEST) initScrapeCache()
    }

    log.info(`Categories to scrape: ${categories.length}`)
    log.info(`Est. time (scrape only): ~${Math.round(categories.length * 6.5 / 3600)}h`)
    console.log()

    const start = new Date()

    // ─── PHASE 1: SCRAPE ───────────────────────────────────────────────────────
    // allProducts and bestSellerEdges are NOT kept in memory during Phase 1.
    // Written to NDJSON cache per-category; loaded back from disk before Phase 2.
    // This keeps Phase 1 heap stable regardless of category count.

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
    let enriched_ok = 0, enriched_fail = 0, totalOrganicEdges = 0
    let totalUniqueAsins = 0, totalBestSellerEdges = 0

    const printSummary = (interrupted: boolean) => {
        log.amazonSummary({
            scrapedOk: scraped_ok,
            scrapedEmpty: scraped_empty,
            scrapedFail: scraped_fail,
            uniqueAsins: totalUniqueAsins,
            enrichedOk: enriched_ok,
            enrichedFail: enriched_fail,
            bestSellerEdges: totalBestSellerEdges,
            organicEdges: totalOrganicEdges,
            elapsedMs: Date.now() - start.getTime(),
            medianProducts: calcMedian(scrapeProductCounts),
        }, runMode, interrupted)
        if (interrupted) log.warn('Resume with: npm run scrape:amazon:resume')
    }
    const handleSigint = () => { printSummary(true); process.exit(130) }
    process.on('SIGINT', handleSigint)

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
            scraped_empty++
            cp.scraped_ids.push(category.id)
            if (!IS_TEST) await markCategoryScraped(db, category.id)
        } else {
            scraped_ok++
            scrapeProductCounts.push(products.length)
            cp.scraped_ids.push(category.id)

            const totalBadges: number | undefined = (products as any)._totalBadges
            log.scrape(category.id, category.name, category.full_path, products.length, totalBadges)

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
        await jitter(AMAZON_CONFIG.delay_min_ms, AMAZON_CONFIG.delay_max_ms)
    }

    await browser.close()

    const { allProducts, bestSellerEdges } = IS_TEST
        ? { allProducts: new Map<string, ScrapedProduct>(), bestSellerEdges: [] as CategoryRankRow[] }
        : await loadScrapeCache()

    const uniqueAsins = [...allProducts.keys()]
    totalUniqueAsins = uniqueAsins.length
    totalBestSellerEdges = bestSellerEdges.length
    log.success(`Scraping complete — ${scraped_ok} scraped | ${scraped_empty} empty | ${scraped_fail} failed | ${uniqueAsins.length} unique ASINs`)

    // ─── PHASE 2: ENRICH ───────────────────────────────────────────────────────
    // Streaming 20 ASINs at a time (fee-estimate batch limit) so catalogMap and
    // feeMap never exceed 20 entries — eliminates O(N) memory accumulation.

    log.section('Phase 2 — SP-API Enrichment', badge)

    const bestSellerEdgesByAsin = new Map<string, CategoryRankRow[]>()
    for (const edge of bestSellerEdges) {
        const arr = bestSellerEdgesByAsin.get(edge.asin)
        if (arr) arr.push(edge)
        else bestSellerEdgesByAsin.set(edge.asin, [edge])
    }

    const enrichedProducts: ProductRow[] = []
    const pendingRanks: CategoryRankRow[] = []
    const failedEnrichmentAsins = new Set<string>()

    let catalog_ok = 0, catalog_fail = 0
    const enrichStart = new Date()

    const alreadyEnriched = new Set(cp?.enriched_asins ?? [])
    const alreadyFailed = new Set(cp?.failed_asins ?? [])
    const toEnrich = IS_RESUME && cp
        ? uniqueAsins.filter(a => !alreadyEnriched.has(a) && !alreadyFailed.has(a))
        : uniqueAsins

    log.info(`ASINs to enrich: ${toEnrich.length}`)
    if (IS_TEST) log.warn('SP-API calls ARE made in test mode — check your console output carefully')
    if (IS_UPLOAD_TEST) log.warn('UPLOAD-TEST — SP-API calls ARE made and results WILL be written to DB')
    console.log()

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

        // ── 2a: Catalog items — corrected fire-time scheduling ─────────────────
        const catalogBatch = new Map<string, CatalogItemResult | null>()
        let nextFireAt = 0
        for (const asin of batch) {
            const wait = nextFireAt - Date.now()
            if (wait > 0) await sleep(wait)
            nextFireAt = Date.now() + AMAZON_CONFIG.catalog_interval_ms
            if (IS_TEST || IS_UPLOAD_TEST) log.api(`Enriching ${asin} — getCatalogItem`)
            try {
                catalogBatch.set(asin, await getCatalogItem(asin))
                catalog_ok++
            } catch (err) {
                log.error(`Catalog fetch exception for ${asin}: ${(err as Error).message}`)
                catalogBatch.set(asin, null)
                catalog_fail++
            }
            if (Date.now() > nextFireAt) {
                nextFireAt = Date.now() + AMAZON_CONFIG.catalog_interval_ms
            }
        }

        // ── 2b: Fee estimates ──────────────────────────────────────────────────
        const batchPriced = batch
            .map(asin => ({
                asin,
                price: catalogBatch.get(asin)?.list_price ?? allProducts.get(asin)!.price,
            }))
            .filter((x): x is { asin: string; price: number } => x.price !== null)
        const feeBatch = await getFeesEstimatesBatch(batchPriced)

        // ── 2c: Enrich each ASIN ───────────────────────────────────────────────
        for (const asin of batch) {
            const scraped = allProducts.get(asin)!
            const catalog = catalogBatch.get(asin) ?? null

            try {
                const { product, ranks } = enrichAsin(asin, scraped, catalog, feeBatch.get(asin) ?? null)

                enrichedProducts.push(product)
                pendingRanks.push(...ranks)
                totalOrganicEdges += ranks.length

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
                        scrapedName: scraped.name,
                        scrapedPrice: scraped.price,
                        rating: product.rating ?? null,
                        reviewCount: product.review_count ?? null,
                        productUrl: scraped.product_url,
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
                        itemL: product.item_length_cm ?? null,
                        itemW: product.item_width_cm ?? null,
                        itemH: product.item_height_cm ?? null,
                        itemWt: product.item_weight_kg ?? null,
                        pkgL: product.pkg_length_cm ?? null,
                        pkgW: product.pkg_width_cm ?? null,
                        pkgH: product.pkg_height_cm ?? null,
                        pkgWt: product.pkg_weight_kg ?? null,
                        spApiPrice: catalog?.list_price ?? null,
                        fbaFee: product.fba_fee ?? null,
                        referralFee: product.referral_fee ?? null,
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

        // ── Periodic flush every FLUSH_EVERY enriched ASINs ───────────────────
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

    // Final flush
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
    printSummary(false)
    process.off('SIGINT', handleSigint)
}

// ─── FATAL ERROR ─────────────────────────────────────────────────────────────

main().catch(err => {
    log.error(`FATAL: ${(err as Error).message}`)
    log.warn('If the run was partially complete, retry with: npm run scrape:amazon:resume')
    process.exit(1)
})
