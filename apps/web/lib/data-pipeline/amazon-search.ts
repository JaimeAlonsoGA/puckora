import type { Json } from '@puckora/types'
/**
 * Data pipeline: Amazon keyword search.
 *
 * Fetches search results from Apify (axesso_data/amazon-search-scraper) and
 * persists products + trending_products + log search_history.
 */

import { runApifyActor } from '@/lib/apify/client'
import { APIFY_ACTOR_ID } from '@/lib/apify/types'
import type { AmazonSearchInput, AmazonSearchOutput } from '@/lib/apify/types'
import { upsertProducts } from '@/lib/services/products'
import { upsertTrendingProducts, logSearchHistory } from '@/lib/services/market'
import type { ProductInsert, TrendingProductInsert } from '@puckora/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

/** Map domain codes to puckora marketplace codes */
const DOMAIN_TO_MARKETPLACE: Record<string, string> = {
    com: 'US', ca: 'CA', de: 'DE', co_uk: 'UK', fr: 'FR',
    it: 'IT', es: 'ES', nl: 'NL', se: 'SE', pl: 'PL',
    com_tr: 'TR', ae: 'AE', sa: 'SA', in: 'IN',
    co_jp: 'JP', com_au: 'AU', com_sg: 'SG', com_br: 'BR',
}

function domainToMarketplace(domainCode: string): string {
    return DOMAIN_TO_MARKETPLACE[domainCode] ?? 'US'
}

function parseRatingNumber(ratingStr: string | null | undefined): number | null {
    if (!ratingStr) return null
    const match = ratingStr.match(/[\d.]+/)
    return match ? parseFloat(match[0]) : null
}

function parsePrice(raw: number | null | undefined): number | null {
    if (raw == null || isNaN(raw)) return null
    return raw
}

function normaliseSearchResultToProduct(item: AmazonSearchOutput): ProductInsert | null {
    if (!item.asin) return null
    const marketplace = domainToMarketplace(item.domainCode)
    const now = new Date().toISOString()

    return {
        asin: item.asin,
        title: item.productDescription,
        marketplace: marketplace as ProductInsert['marketplace'],
        brand: item.manufacturer ?? null,
        price: parsePrice(item.price),
        price_min: parsePrice(item.price),
        price_max: parsePrice(item.retailPrice),
        main_image_url: item.imgUrl ?? null,
        rating: parseRatingNumber(item.productRating),
        review_count: item.countReview,
        is_fba: null,
        is_sold_by_amazon: null,
        is_adult: false,
        is_hazmat: false,
        is_oversized: false,
        currency: 'USD',
        raw_data: item as unknown as Json,
        scraped_at: now,
        needs_refresh_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at: now,
    }
}

function normaliseToTrending(
    item: AmazonSearchOutput,
    marketplace: string,
): TrendingProductInsert | null {
    if (!item.asin) return null
    return {
        asin: item.asin,
        title: item.productDescription,
        marketplace,
        price: parsePrice(item.price),
        bsr: null,
        category: item.categories[0] ?? null,
        image_url: item.imgUrl ?? null,
        monthly_sales_est: null,
        opportunity_score: null,
        competition_score: null,
    }
}

export interface FetchAmazonSearchOptions {
    keyword: string
    /** puckora marketplace code, e.g. "US", "DE" */
    marketplace: string
    /** Amazon domain code, e.g. "com", "de" */
    domainCode: string
    maxPages?: number
    sortBy?: string
    category?: string
    userId?: string
    workspaceId?: string
}

export interface FetchAmazonSearchResult {
    keyword: string
    totalResults: number
    productsUpserted: number
    topAsin: string | null
}

/**
 * Search Amazon for a keyword, persist all found products, and log search history.
 */
export async function fetchAndPersistAmazonSearch(
    supabase: SupabaseInstance,
    options: FetchAmazonSearchOptions,
): Promise<FetchAmazonSearchResult> {
    const marketplace = domainToMarketplace(options.domainCode)

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

    // Normalise
    const productInserts = rawResults
        .map(normaliseSearchResultToProduct)
        .filter((p): p is ProductInsert => p !== null)

    const trendingInserts = rawResults
        .map((r) => normaliseToTrending(r, marketplace))
        .filter((t): t is TrendingProductInsert => t !== null)

    // Persist in parallel
    const [upsertedProducts] = await Promise.all([
        upsertProducts(supabase, productInserts),
        upsertTrendingProducts(supabase, trendingInserts),
    ])

    // Log search history (non-blocking, errors are swallowed inside logSearchHistory)
    if (options.userId) {
        await logSearchHistory(
            supabase,
            options.userId,
            options.keyword,
            marketplace as Parameters<typeof logSearchHistory>[3],
            'keyword',
            totalResults,
            rawResults[0]?.asin,
            options.workspaceId,
        )
    }

    return {
        keyword: options.keyword,
        totalResults,
        productsUpserted: upsertedProducts.length,
        topAsin: rawResults[0]?.asin ?? null,
    }
}
