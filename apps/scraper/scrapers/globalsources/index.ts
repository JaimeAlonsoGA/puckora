/**
 * Puckora — GlobalSources Scraper
 *
 * Two-phase flow (listing → product detail) that builds the gs_products +
 * gs_suppliers tables in Supabase.
 *
 * Design decisions:
 *  • Phase 1 (listing): used ONLY to collect product URLs — no card data is
 *    stored in DB (product detail covers everything listing provides).
 *  • Phase 2 (product detail): full scrape → upsert supplier + product.
 *  • Concurrency controlled via GS_CONFIG.product_concurrency (default 2).
 *  • Checkpoint: saves progress per category so --resume works.
 *
 * Usage:
 *   npx tsx scrapers/globalsources/index.ts                          # full run
 *   npx tsx scrapers/globalsources/index.ts --test 3                 # 3 categories, no DB writes
 *   npx tsx scrapers/globalsources/index.ts --resume                 # skip already-done categories
 *   npx tsx scrapers/globalsources/index.ts --category headphones-for-sale-price_18148
 */
import fs from 'fs'
import path from 'path'
import { GS_CONFIG } from './config'
import { log } from '../../shared/logger'
import { sleep, jitter, pooled, eta } from '../../shared/utils'
import { parseScraperArgs } from '../../shared/cli'
import { launchBrowser } from './browser'
import { createDb } from '../../shared/db'
import { scrapeGsListing } from './pages/listing'
import { scrapeGsProduct } from './pages/product'
import { scrapeGsSupplierListing } from './pages/supplier-listing'
import { upsertGsSupplier, upsertGsSupplierCards } from './db/suppliers'
import { upsertGsProducts, markGsProductFailed } from './db/products'
import { bulkUpsertCategories, upsertGsCategorySignals } from './db/categories'
import { loadCheckpoint, saveCheckpoint, freshCheckpoint } from './checkpoint'
import { initScrapeCache, appendScrapeCache } from './cache'

// ─── ARGS ────────────────────────────────────────────────────────────────────

const { IS_TEST, IS_UPLOAD_TEST, IS_RESUME, TEST_LIMIT, UPLOAD_TEST_LIMIT, SINGLE_ID } = parseScraperArgs()

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface CategoryEntry {
    url: string
    name?: string
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function loadCategories(): CategoryEntry[] {
    const file = path.resolve(GS_CONFIG.categories_file)
    if (!fs.existsSync(file)) {
        throw new Error(
            `Categories file not found: ${file}\n` +
            'Run: npx tsx tools/globalsources/scrape-categories.ts'
        )
    }
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8'))

    function collectLeaves(nodes: any[]): CategoryEntry[] {
        const result: CategoryEntry[] = []
        for (const node of nodes) {
            const kids: any[] | undefined = node.children ?? node.subcategories
            if (kids && kids.length > 0) {
                result.push(...collectLeaves(kids))
            } else if (node.url) {
                result.push({ url: node.url, name: node.name })
            }
        }
        return result
    }

    if (Array.isArray(raw)) {
        return raw.map((r: any) =>
            typeof r === 'string' ? { url: r } : { url: r.url, name: r.name }
        )
    }
    if (raw && Array.isArray(raw.categories)) {
        return collectLeaves(raw.categories)
    }
    throw new Error('Unexpected categories file format — expected JSON array or { categories: [...] }')
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
    const runMode = IS_TEST ? 'test' : IS_UPLOAD_TEST ? 'upload-test' : 'full'
    const badge = IS_TEST ? 'TEST — no DB writes' : IS_UPLOAD_TEST ? 'UPLOAD-TEST' : undefined
    log.section('Puckora — GlobalSources Scraper', badge)
    log.info(`Proxy  : ${GS_CONFIG.proxy_url ? GS_CONFIG.proxy_url.replace(/:[^:@]+@/, ':***@') : 'none'}`)
    log.info(`Resume : ${IS_RESUME}`)
    log.info(`Mode   : ${runMode}${IS_TEST ? ` (${TEST_LIMIT} cats)` : IS_UPLOAD_TEST ? ` (${UPLOAD_TEST_LIMIT} cats)` : ''}`)
    console.log()

    // ── Load categories ────────────────────────────────────────────────────────
    let categories: CategoryEntry[]
    let allCategories: CategoryEntry[] = []
    try {
        categories = loadCategories()
        allCategories = categories
        log.success(`Loaded ${categories.length} categories`)
    } catch (e) {
        log.error((e as Error).message)
        process.exit(1)
    }

    if (SINGLE_ID) {
        categories = categories.filter(c => c.url.includes(SINGLE_ID))
        if (categories.length === 0) {
            log.error(`No category matching: ${SINGLE_ID}`)
            process.exit(1)
        }
    }

    if (IS_TEST && TEST_LIMIT !== null) {
        for (let i = categories.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [categories[i], categories[j]] = [categories[j], categories[i]]
        }
        categories = categories.slice(0, TEST_LIMIT)
    } else if (IS_UPLOAD_TEST && UPLOAD_TEST_LIMIT !== null) {
        for (let i = categories.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [categories[i], categories[j]] = [categories[j], categories[i]]
        }
        categories = categories.slice(0, UPLOAD_TEST_LIMIT)
    }

    // ── Checkpoint / resume ────────────────────────────────────────────────────
    const cp = loadCheckpoint() ?? freshCheckpoint()
    if (IS_RESUME && cp.scraped_urls.length > 0) {
        const done = new Set(cp.scraped_urls)
        const before = categories.length
        categories = categories.filter(c => !done.has(c.url))
        log.info(`Resuming — skipping ${before - categories.length} already-scraped, ${categories.length} remaining`)
    }

    if (categories.length === 0) {
        log.success('All categories already scraped.')
        return
    }

    log.info(`Categories to scrape: ${categories.length}`)
    console.log()

    // ── Setup ──────────────────────────────────────────────────────────────────
    if (IS_TEST || IS_UPLOAD_TEST) initScrapeCache()
    const db = IS_TEST ? null : createDb()

    let categoryIdMap = new Map<string, string>()
    if (db) {
        log.info(`Seeding ${allCategories.length} categories to DB…`)
        categoryIdMap = await bulkUpsertCategories(db, allCategories)
    }

    const browser = await launchBrowser()

    // ── Run state (closed over by SIGINT handler and summary) ─────────────────
    let catsOk = 0, catsEmpty = 0, catsBlocked = 0
    let totalProducts = 0, totalFailed = 0, totalSuppliers = 0
    const start = new Date()

    const printSummary = (interrupted: boolean) => {
        log.gsSummary(
            { catsOk, catsEmpty, catsBlocked, totalProducts, totalFailed, totalSuppliers, elapsedMs: Date.now() - start.getTime() },
            runMode,
            interrupted,
        )
    }

    const handleSigint = () => {
        printSummary(true)
        process.exit(130)
    }
    process.on('SIGINT', handleSigint)

    try {
        // ── Category loop ──────────────────────────────────────────────────────
        for (let catIdx = 0; catIdx < categories.length; catIdx++) {
            const cat = categories[catIdx]
            const catNum = `[${catIdx + 1}/${categories.length}]`
            const catLabel = cat.name ?? cat.url.split('/').filter(Boolean).pop() ?? cat.url

            // In-place progress panel (replaced automatically by the next log.* call)
            log.gsPanel({
                done: catIdx,
                total: categories.length,
                ok: catsOk,
                empty: catsEmpty,
                blocked: catsBlocked,
                products: totalProducts,
                supplierCards: totalSuppliers,
                failed: totalFailed,
                etaStr: eta(catIdx, categories.length, start),
                label: catLabel,
            })

            const sourceCategoryId = categoryIdMap.get(cat.url) ?? null

            // Phase 1: collect product URLs from listing page
            const listingResult = await scrapeGsListing(browser, cat.url)

            if (listingResult.blocked) {
                catsBlocked++
                cp.failed_urls.push(cat.url)
                if (!IS_TEST) saveCheckpoint(cp)
                log.blocked(`${catNum} ${catLabel} — listing blocked after ${GS_CONFIG.retry_max} retries`)
                continue
            }
            if (listingResult.empty) {
                catsEmpty++
                cp.scraped_urls.push(cat.url)
                if (!IS_TEST) saveCheckpoint(cp)
                log.info(`${catNum} ${catLabel} — no products`)
                continue
            }

            // Persist category signals (single compact line, test-only verbose output)
            const hasSigs = (
                listingResult.peopleAlsoSearch.length > 0 ||
                listingResult.trending.length > 0 ||
                listingResult.topCategories.length > 0
            )
            if (IS_TEST && hasSigs) {
                const sample = (arr: string[]) =>
                    arr.length ? arr.slice(0, 3).join(', ') + (arr.length > 3 ? ` +${arr.length - 3}` : '') : '—'
                log.info(
                    `${catNum} signals  PAS: ${sample(listingResult.peopleAlsoSearch)}` +
                    `  |  Trending: ${sample(listingResult.trending)}` +
                    `  |  TopCats: ${sample(listingResult.topCategories)}`
                )
            }
            if (!IS_TEST && db && hasSigs) {
                await upsertGsCategorySignals(db, {
                    url: cat.url,
                    peopleAlsoSearch: listingResult.peopleAlsoSearch,
                    trending: listingResult.trending,
                    topCategories: listingResult.topCategories,
                })
            }

            // Phase 1b: scrape supplier listing
            {
                const supplierCards = await scrapeGsSupplierListing(browser, cat.url)
                if (supplierCards.length > 0) {
                    totalSuppliers += supplierCards.length
                    if (IS_TEST) for (const card of supplierCards) log.gsSupplierCard(card)
                    if (!IS_TEST && db) await upsertGsSupplierCards(db, supplierCards)
                }
            }

            const productUrls = listingResult.cards
                .map(c => c.url)
                .filter(Boolean) as string[]

            if (productUrls.length === 0) {
                catsEmpty++
                cp.scraped_urls.push(cat.url)
                if (!IS_TEST) saveCheckpoint(cp)
                log.info(`${catNum} ${catLabel} — listing parsed but no product URLs`)
                continue
            }

            // Phase 2: scrape each product detail page
            const batchResults: Array<{
                detail: import('@puckora/scraper-core').GlobalSourcesProductDetail
                supplierId: string | null
                sourceCategoryId: string | null
            }> = []

            await pooled(productUrls, GS_CONFIG.product_concurrency, async (url) => {
                const detail = await scrapeGsProduct(browser, url)
                if (!detail) {
                    totalFailed++
                    if (!IS_TEST && db) await markGsProductFailed(db, url, url.match(/-(\d{8,})p\.htm/)?.[1] ?? url)
                    return
                }

                let supplierId: string | null = null
                if (!IS_TEST && db) supplierId = await upsertGsSupplier(db, detail)

                batchResults.push({ detail, supplierId, sourceCategoryId })

                // Verbose per-product dump only in test / upload-test modes
                if (IS_TEST || IS_UPLOAD_TEST) log.gsProduct(detail)

                await jitter(GS_CONFIG.delay_min_ms, GS_CONFIG.delay_max_ms)
            })

            if (!IS_TEST && db && batchResults.length > 0) {
                await upsertGsProducts(db, batchResults)
            }

            if ((IS_TEST || IS_UPLOAD_TEST) && batchResults.length > 0) {
                appendScrapeCache({
                    categoryUrl: cat.url,
                    categoryName: cat.name,
                    products: batchResults.map(r => r.detail),
                })
            }

            catsOk++
            totalProducts += batchResults.length
            cp.scraped_urls.push(cat.url)
            if (!IS_TEST) saveCheckpoint(cp)

            const n = batchResults.length
            const details = batchResults.map(r => r.detail)
            const withPrice = details.filter(d => d.price_low != null).length
            const withSpecs = details.filter(d => d.key_specifications).length
            log.success(
                `${catNum} ${catLabel}  —  ${n} products` +
                (n > 0 ? `  (price ${withPrice}/${n}  specs ${withSpecs}/${n})` : '') +
                (totalFailed > 0 ? `  — ${totalFailed} failed total` : '')
            )

            if (catIdx < categories.length - 1) {
                await jitter(GS_CONFIG.delay_min_ms, GS_CONFIG.delay_max_ms)
            }
        }
    } finally {
        process.off('SIGINT', handleSigint)
        await browser.close()
    }

    // ── Summary ────────────────────────────────────────────────────────────────
    console.log()
    log.section('Run Complete')
    printSummary(false)
    if (IS_TEST) log.warn(`TEST mode — no data written to Supabase. Results saved to: ${GS_CONFIG.scrape_cache_file}`)
    if (IS_UPLOAD_TEST) log.success(`UPLOAD-TEST complete — data written to Supabase and to: ${GS_CONFIG.scrape_cache_file}`)
}

// ─── FATAL ERROR ─────────────────────────────────────────────────────────────

main().catch(err => {
    log.error(`FATAL: ${(err as Error).message}`)
    log.warn('If the run was partially complete, retry with: npm run scrape:globalsources:resume')
    process.exit(1)
})
