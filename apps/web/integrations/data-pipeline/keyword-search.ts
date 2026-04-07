/**
 * SP-API keyword search pipeline.
 *
 * Runs as a background task (via `after()` in the server action) immediately
 * after a search job is created.
 *
 * What this does per search:
 *  1. Scrapes the live Amazon HTML search page for immediate listing discovery.
 *  2. Calls searchCatalogItems(keyword) for aggregate keyword stats and top-result supplementation.
 *  3. Calls getCatalogItemParsed(asin) for each discovered ASIN to fetch the full
 *     catalog payload the scraper path depends on.
 *  4. Calls getFeesEstimatesBatch for every priced ASIN in the discovered set.
 *  5. Upserts amazon_products with catalog + fee data for all discovered ASINs.
 *  6. Links each ASIN to the keyword via amazon_keyword_products (idempotent).
 *  7. Persists organic category-rank rows when the category already exists in Fly.
 *
 * This keeps the server-first path self-sufficient for immediate search UX.
 */

import {
    enrichAsin,
    getCatalogItemParsed,
    searchCatalogItems,
    parseCatalogItem,
} from '@puckora/sp-api'
import { SCRAPE_EXECUTOR, SCRAPE_JOB_STATUS } from '@puckora/scraper-core'
import {
    getKnownAmazonCategoryIds,
    upsertAmazonProduct,
    upsertProductCategoryRanks,
} from '@/services/products'
import { updateScrapeJob } from '@/services/scrape'
import { clearKeywordProducts, updateKeyword, upsertKeywordProduct } from '@/services/keywords'
import type { PgDb } from '@puckora/db'
import type { CatalogItemResult } from '@puckora/sp-api'
import type { Json } from '@puckora/types'
import type { SupabaseDatabaseClient } from '@/integrations/supabase/types'
import {
    fetchSearchListings,
    getMarketplaceId,
} from './keyword-search/amazon-html-source'
import {
    KEYWORD_SEARCH_ERROR_MESSAGE,
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
        // A new run should reflect the current search snapshot, not every ASIN
        // historically linked to this canonical keyword row.
        await clearKeywordProducts(db, keywordId)

        const itemErrors: string[] = []
        let scrapedListings: SearchListingSnapshot[] = []

        try {
            scrapedListings = await fetchSearchListings(keyword, marketplace)
        } catch (err) {
            const message = getKeywordSearchItemErrorMessage(err, KEYWORD_SEARCH_ERROR_MESSAGE.HTML_SEARCH_FAILED)
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
                const message = getKeywordSearchItemErrorMessage(result.reason, KEYWORD_SEARCH_ERROR_MESSAGE.WRITE_FAILED)
                itemErrors.push(`${scrapedListings[idx].asin}: ${message}`)
                console.error(`[keyword-search] failed to persist HTML listing ${scrapedListings[idx].asin}:`, result.reason)
            }
        })

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

        const catalogMap = new Map<string, CatalogItemResult | null>()
        for (const listing of previewListingsForEnrichment) {
            try {
                const catalog = await getCatalogItemParsed(listing.asin, { marketplaceId })
                catalogMap.set(listing.asin, catalog)
            } catch (err) {
                const message = getKeywordSearchItemErrorMessage(err, KEYWORD_SEARCH_ERROR_MESSAGE.CATALOG_FETCH_FAILED)
                itemErrors.push(`${listing.asin}: ${message}`)
                catalogMap.set(listing.asin, null)
                console.error(`[keyword-search] catalog fetch failed for ${listing.asin}:`, err)
            }
        }

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

        // Enrich + upsert all ASINs concurrently. The three DB writes per ASIN
        // are independent of each other — run them in parallel too. SP-API
        // catalog fetches above remain sequential (rate-limit protection).
        const enrichSettled = await Promise.allSettled(
            previewListingsForEnrichment.map(async (listing) => {
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
            }),
        )
        enrichSettled.forEach((result, idx) => {
            if (result.status === 'rejected') {
                const message = getKeywordSearchItemErrorMessage(result.reason, KEYWORD_SEARCH_ERROR_MESSAGE.WRITE_FAILED)
                itemErrors.push(`${previewListingsForEnrichment[idx].asin}: ${message}`)
                console.error(`[keyword-search] failed for ASIN ${previewListingsForEnrichment[idx].asin}:`, result.reason)
            }
        })

        if (!response) {
            itemErrors.push(KEYWORD_SEARCH_ERROR_MESSAGE.ENRICHMENT_UNAVAILABLE)
        }

        if (!response && scrapedListings.length === 0) {
            throw new Error(`Search returned no HTML listings and no SP-API results for "${keyword}"`)
        }

        const previewListings = [...previewListingsByAsin.values()]
            .sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER))
            .map((listing) => buildPreviewListing(listing))

        await updateScrapeJob(supabase, jobId, {
            status: SCRAPE_JOB_STATUS.DONE,
            executor: SCRAPE_EXECUTOR.AGENT,
            error: itemErrors.length > 0 ? itemErrors.slice(0, 3).join('; ') : null,
            completed_at: new Date().toISOString(),
            result: toKeywordSearchResultJson(previewListings),
        })
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
