/**
 * SP-API keyword search pipeline.
 *
 * Runs as a background task (via `after()` in the server action) immediately
 * after a search job is created.
 *
 * What this does per search:
 *  1. Scrapes the live Amazon HTML search page for immediate listing discovery.
 *  2. Calls searchCatalogItems(keyword) for aggregate keyword stats and top-result supplementation.
 *     parseCatalogItem() on each result pre-populates the catalogMap — no per-ASIN API calls.
 *  3. Calls getFeesEstimatesBatch for every priced ASIN in the discovered set.
 *  4. Upserts amazon_products with catalog + fee data for all discovered ASINs,
 *     at most 5 concurrent writes (pooled) to stay within pg connection limits.
 *  5. Links each ASIN to the keyword via amazon_keyword_products (idempotent).
 *  6. Persists organic category-rank rows when the category already exists in Fly.
 *
 * This keeps the server-first path self-sufficient for immediate search UX.
 */

import {
    enrichAsin,
    searchCatalogItems,
    parseCatalogItem,
} from '@puckora/sp-api'
import { SCRAPE_EXECUTOR, SCRAPE_JOB_STATUS } from '@puckora/scraper-core'
import { pooled } from '@puckora/utils'
import {
    getKnownAmazonCategoryIds,
    upsertAmazonProduct,
    upsertProductCategoryRanks,
} from '@/services/products'
import { updateScrapeJob } from '@/services/scrape'
import { deleteStaleKeywordProducts, updateKeyword, upsertKeywordProduct } from '@/services/keywords'
import type { PgDb } from '@puckora/db'
import type { CatalogItemResult } from '@puckora/sp-api'
import type { Json } from '@puckora/types'
import type { SupabaseDatabaseClient } from '@/integrations/supabase/types'
import {
    fetchSearchListings,
    getMarketplaceId,
} from './keyword-search/amazon-html-source'
import { KEYWORD_SEARCH_PIPELINE_ERRORS } from '@/constants/api'
import {
    RunKeywordSearchParamsSchema,
    type RunKeywordSearchParams,
    type SearchListingSnapshot,
} from './keyword-search/contracts'
import {
    buildPreviewListing,
    buildScrapedProductInsert,
    getFeeEstimateMap,
    getKeywordSearchFailureMessage,
    getKeywordSearchItemErrorMessage,
    mergePreviewListing,
} from './keyword-search/preview-builders'
import { repairBpmBatch } from './bpm-repair'
import { enrichAsinBatch } from './enrich'

function toScrapedListingJson(listing: ReturnType<typeof buildPreviewListing>): Json {
    return {
        asin: listing.asin,
        rank: listing.rank,
        name: listing.name,
        price: listing.price,
        rating: listing.rating,
        review_count: listing.review_count,
        product_url: listing.product_url,
    }
}

function toKeywordSearchResultJson(listings: ReturnType<typeof buildPreviewListing>[]): Json {
    return {
        listings: listings.map(toScrapedListingJson),
    }
}

/**
 * Execute the SP-API keyword search for a given keyword search row.
 * @param supabase   - Admin Supabase client (bypasses RLS)
 * @param keywordId  - ID of the pre-created amazon_keywords stub row
 * @param keyword    - Raw search term (e.g. "lap desk")
 * @param marketplace - Puckora marketplace code (e.g. "US")
 */
export async function runKeywordSearch(
    db: PgDb,
    supabase: SupabaseDatabaseClient,
    params: RunKeywordSearchParams,
): Promise<void> {
    const { jobId, keywordId, keyword, marketplace } = RunKeywordSearchParamsSchema.parse(params)
    const marketplaceId = getMarketplaceId(marketplace)

    await updateScrapeJob(supabase, jobId, {
        status: SCRAPE_JOB_STATUS.RUNNING,
        executor: SCRAPE_EXECUTOR.AGENT,
        error: null,
        completed_at: null,
    })

    try {
        const _t0 = Date.now()
        const _elapsed = () => `+${((Date.now() - _t0) / 1000).toFixed(2)}s`
        console.log(`[pipeline:${keyword}] START`)

        const itemErrors: string[] = []
        // Track every ASIN we write so stale links from previous runs can be
        // removed atomically at the end — keeps existing products visible during
        // the search instead of clearing them upfront (avoids blank-slate UX).
        const discoveredAsinSet = new Set<string>()
        let scrapedListings: SearchListingSnapshot[] = []

        try {
            scrapedListings = await fetchSearchListings(keyword, marketplace)
        } catch (err) {
            const message = getKeywordSearchItemErrorMessage(err, KEYWORD_SEARCH_PIPELINE_ERRORS.HTML_SEARCH_FAILED)
            itemErrors.push(`html-search: ${message}`)
            console.error('[keyword-search] HTML listing fetch failed:', err)
        }

        // Upsert all scraped HTML listings concurrently.
        // upsertAmazonProduct must complete first — upsertKeywordProduct has a
        // FK on amazon_products.asin and cannot run until the parent row exists.
        const scrapeSettled = await Promise.allSettled(
            scrapedListings.map(async (listing) => {
                await upsertAmazonProduct(db, buildScrapedProductInsert(listing))
                await upsertKeywordProduct(db, { keyword_id: keywordId, asin: listing.asin })
            }),
        )
        scrapeSettled.forEach((result, idx) => {
            if (result.status === 'rejected') {
                const message = getKeywordSearchItemErrorMessage(result.reason, KEYWORD_SEARCH_PIPELINE_ERRORS.WRITE_FAILED)
                itemErrors.push(`${scrapedListings[idx].asin}: ${message}`)
                console.error(`[keyword-search] failed to persist HTML listing ${scrapedListings[idx].asin}:`, result.reason)
            }
        })
        // HTML listings are now in the DB; track their ASINs.
        for (const listing of scrapedListings) discoveredAsinSet.add(listing.asin)
        console.log(`[pipeline:${keyword}] HTML_DONE ${_elapsed()} — ${scrapedListings.length} listings scraped`)

        const previewListingsByAsin = new Map<string, SearchListingSnapshot>()
        for (const listing of scrapedListings) {
            previewListingsByAsin.set(listing.asin, listing)
        }

        const response = await searchCatalogItems({
            keywords: [keyword],
            marketplaceIds: [marketplaceId],
            includedData: ['summaries', 'attributes', 'images', 'salesRanks', 'productTypes', 'dimensions'],
            pageSize: 20,
            locale: 'en_US',
        })

        if (response) {
            await updateKeyword(db, keywordId, {
                total_results: response.numberOfResults,
                unique_brands: response.refinements?.brands?.length ?? null,
            })
        }
        console.log(`[pipeline:${keyword}] SPAPI_SEARCH_DONE ${_elapsed()} — ${response?.items.length ?? 0} SP-API items, totalResults=${response?.numberOfResults ?? 'n/a'}`)

        const parsedItems = response?.items.map((item, idx) => ({
            item,
            rank: idx + 1,
            parsed: parseCatalogItem(item, marketplaceId),
        })) ?? []
        // Merge SP-API summary hits into the preview set before doing the full,
        // per-ASIN catalog fetch that the scraper path depends on.
        for (const { item, rank, parsed } of parsedItems) {
            const previewListing = mergePreviewListing(
                item.asin,
                rank,
                marketplace,
                parsed,
                previewListingsByAsin.get(item.asin),
            )
            previewListingsByAsin.set(item.asin, previewListing)
        }

        const previewListingsForEnrichment = [...previewListingsByAsin.values()]
            .sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER))

        // Build catalogMap exclusively from searchCatalogItems summary data.
        // parseCatalogItem() returns the same CatalogItemResult type as
        // getCatalogItemParsed(), with no additional API calls needed.
        //
        // HTML-only ASINs (not in the SP-API top-20) get catalog = null.
        // enrichAsin handles null gracefully: price/rating/title/image come
        // from the HTML scrape; FBA fees are still estimated from price;
        // scrape_status = ENRICHMENT_FAILED, which triggers the per-ASIN
        // enrich route to fill in brand/dimensions later.
        //
        // Removing per-ASIN getCatalogItemParsed calls eliminates the source
        // of real Amazon 429s that previously stalled the pipeline for 60 s+.
        const catalogMap = new Map<string, CatalogItemResult | null>()
        for (const { item, parsed } of parsedItems) {
            catalogMap.set(item.asin, parsed)
            discoveredAsinSet.add(item.asin)
        }

        const catalogHits = [...catalogMap.entries()].filter(([, v]) => v !== null).length
        const catalogMisses = [...catalogMap.entries()].filter(([, v]) => v === null).length
        console.log(`[pipeline:${keyword}] CATALOG_DONE ${_elapsed()} — ${catalogHits} hits, ${catalogMisses} misses, ${previewListingsForEnrichment.length} total ASINs`)

        const [knownCategoryIds, feeEstimateMap] = await Promise.all([
            getKnownAmazonCategoryIds(
                db,
                previewListingsForEnrichment.flatMap((listing) =>
                    (catalogMap.get(listing.asin)?.category_ranks ?? []).map((categoryRank) => categoryRank.classificationId),
                ),
                marketplace,
            ),
            getFeeEstimateMap(previewListingsForEnrichment, catalogMap, marketplaceId),
        ])

        // Enrich + upsert all ASINs with bounded concurrency.
        // Running all 30 in parallel with Promise.allSettled creates ~90 concurrent
        // PG queries against the same pool and reliably triggers OOM / connection
        // exhaustion on constrained Fly.io instances. pooled(items, 5, ...) caps
        // concurrent enrichments at 5, which keeps the PG pool well within limits
        // while still being much faster than sequential processing.
        const enrichResults = await pooled(
            previewListingsForEnrichment,
            5,
            async (listing) => {
                try {
                    const catalog = catalogMap.get(listing.asin) ?? null

                    const { product, ranks } = enrichAsin(
                        listing.asin,
                        {
                            asin: listing.asin,
                            rank: listing.rank ?? 0,
                            name: listing.name,
                            price: listing.price,
                            rating: listing.rating,
                            review_count: listing.review_count,
                            product_url: listing.product_url,
                            bought_past_month: listing.bought_past_month ?? null,
                        },
                        catalog,
                        feeEstimateMap.get(listing.asin) ?? null,
                    )

                    const categoryRanks = ranks.filter((r) => knownCategoryIds.has(r.category_id))

                    // upsertAmazonProduct must complete first — both FK-dependent
                    // writes (category ranks + keyword link) reference amazon_products.asin.
                    await upsertAmazonProduct(db, {
                        ...product,
                        main_image_url: product.main_image_url ?? listing.main_image_url,
                    })
                    await Promise.all([
                        upsertProductCategoryRanks(db, categoryRanks),
                        upsertKeywordProduct(db, { keyword_id: keywordId, asin: listing.asin }),
                    ])
                    discoveredAsinSet.add(listing.asin)
                    return { ok: true as const, asin: listing.asin }
                } catch (err) {
                    return { ok: false as const, asin: listing.asin, error: err }
                }
            },
        )
        for (const result of enrichResults) {
            if (!result.ok) {
                const message = getKeywordSearchItemErrorMessage(result.error, KEYWORD_SEARCH_PIPELINE_ERRORS.WRITE_FAILED)
                itemErrors.push(`${result.asin}: ${message}`)
                console.error(`[keyword-search] failed for ASIN ${result.asin}:`, result.error)
            }
        }

        const enrichOk = enrichResults.filter((r) => r.ok).length
        const enrichFail = enrichResults.filter((r) => !r.ok).length
        console.log(`[pipeline:${keyword}] ENRICH_DONE ${_elapsed()} — ${enrichOk} ok, ${enrichFail} failed, ${discoveredAsinSet.size} total ASINs tracked`)

        // Remove links that belonged to previous runs but weren't found in this
        // search — old results stayed visible during the run so UX is seamless.
        if (discoveredAsinSet.size > 0) {
            await deleteStaleKeywordProducts(db, keywordId, [...discoveredAsinSet])
        }

        if (!response) {
            itemErrors.push(KEYWORD_SEARCH_PIPELINE_ERRORS.ENRICHMENT_UNAVAILABLE)
        }

        if (!response && scrapedListings.length === 0) {
            throw new Error(`Search returned no HTML listings and no SP-API results for "${keyword}"`)
        }

        const previewListings = [...previewListingsByAsin.values()]
            .sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER))
            .map((listing) => buildPreviewListing(listing))

        console.log(`[pipeline:${keyword}] JOB_DONE ${_elapsed()} — marking DONE, ${previewListings.length} listings in result`)
        await updateScrapeJob(supabase, jobId, {
            status: SCRAPE_JOB_STATUS.DONE,
            executor: SCRAPE_EXECUTOR.AGENT,
            error: itemErrors.length > 0 ? itemErrors.slice(0, 3).join('; ') : null,
            completed_at: new Date().toISOString(),
            result: {
                ...(toKeywordSearchResultJson(previewListings) as object),
                // Tell the client enrichment is done — stops the isEnriching
                // polling window that would otherwise run for ENRICHMENT_TIMEOUT_MS.
                enriched_at: new Date().toISOString(),
            },
        })

        // Background completion tasks — run after the job is DONE so they never
        // delay the user-visible result. Both tasks are independent of each other and
        // run in parallel. They are awaited (not fire-and-forget) so the enclosing
        // after() callback keeps the Node.js runtime alive until both finish.
        const nullBpmAsins = previewListingsForEnrichment
            .filter((l) => l.bought_past_month === null || l.bought_past_month === undefined)
            .map((l) => l.asin)

        // Per-ASIN SP-API enrichment for products not covered by searchCatalogItems
        // (positions 21-60 that had catalog = null). These have scrape_status =
        // ENRICHMENT_FAILED and are missing brand, listing_date, dimensions, and
        // category ranks — all needed for the view.
        const enrichFailedListings = previewListingsForEnrichment.filter(
            (l) => !catalogMap.has(l.asin),
        )

        const backgroundResults = await Promise.allSettled([
            nullBpmAsins.length > 0
                ? repairBpmBatch(db, nullBpmAsins, marketplace)
                : Promise.resolve(),
            enrichFailedListings.length > 0
                ? enrichAsinBatch(db, enrichFailedListings, marketplace)
                : Promise.resolve(),
        ])
        if (backgroundResults[0].status === 'rejected') {
            console.error('[bpm-repair] batch failed:', backgroundResults[0].reason)
        }
        if (backgroundResults[1].status === 'rejected') {
            console.error('[enrich-repair] background batch failed:', backgroundResults[1].reason)
        }
    } catch (err) {
        await updateScrapeJob(supabase, jobId, {
            status: SCRAPE_JOB_STATUS.FAILED,
            executor: SCRAPE_EXECUTOR.AGENT,
            error: err instanceof Error ? err.message : getKeywordSearchFailureMessage(),
            completed_at: new Date().toISOString(),
        })

        throw err
    }
}
