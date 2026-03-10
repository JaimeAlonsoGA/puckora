/**
 * Data pipeline: Amazon keyword search.
 *
 * Fetches search results from Apify (axesso_data/amazon-search-scraper) and
 * upserts products into amazon_products.
 */

import { runApifyActor } from '@/integrations/apify/client'
import { APIFY_ACTOR_ID } from '@/integrations/apify/types'
import type { AmazonSearchInput, AmazonSearchOutput } from '@/integrations/apify/types'
import { upsertAmazonProducts } from '@/services/products'
import type { AmazonProductInsert } from '@puckora/types'
import { parseRatingNumber } from './utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

function parsePrice(raw: number | null | undefined): number | null {
    if (raw == null || isNaN(raw)) return null
    return raw
}

function normaliseSearchResultToProduct(item: AmazonSearchOutput): AmazonProductInsert | null {
    if (!item.asin) return null
    return {
        asin: item.asin,
        title: item.productDescription ?? null,
        manufacturer: item.manufacturer ?? null,
        brand: item.manufacturer ?? null,
        price: parsePrice(item.price),
        main_image_url: item.imgUrl ?? null,
        rating: parseRatingNumber(item.productRating),
        review_count: item.countReview ?? null,
        scrape_status: 'scraped',
        updated_at: new Date().toISOString(),
    }
}

export interface FetchAmazonSearchOptions {
    keyword: string
    /** Amazon domain code, e.g. "com", "de" */
    domainCode: string
    maxPages?: number
    sortBy?: string
    category?: string
}

export interface FetchAmazonSearchResult {
    keyword: string
    totalResults: number
    productsUpserted: number
    topAsin: string | null
}

/**
 * Search Amazon for a keyword and upsert all found products into amazon_products.
 */
export async function fetchAndPersistAmazonSearch(
    supabase: SupabaseInstance,
    options: FetchAmazonSearchOptions,
): Promise<FetchAmazonSearchResult> {
    const rawResults = await runApifyActor<AmazonSearchInput, AmazonSearchOutput>(
        APIFY_ACTOR_ID.amazonSearch,
        {
            input: [
                {
                    keyword: options.keyword,
                    domainCode: options.domainCode,
                    maxPages: options.maxPages ?? 1,
                    ...(options.sortBy ? { sortBy: options.sortBy } : {}),
                    ...(options.category ? { category: options.category } : {}),
                },
            ],
        },
    )

    if (rawResults.length === 0) {
        return { keyword: options.keyword, totalResults: 0, productsUpserted: 0, topAsin: null }
    }

    const totalResults = rawResults[0]?.resultCount ?? rawResults.length

    const productInserts = rawResults
        .map(normaliseSearchResultToProduct)
        .filter((p): p is AmazonProductInsert => p !== null)

    const upserted = await upsertAmazonProducts(supabase, productInserts)

    return {
        keyword: options.keyword,
        totalResults,
        productsUpserted: upserted.length,
        topAsin: rawResults[0]?.asin ?? null,
    }
}
