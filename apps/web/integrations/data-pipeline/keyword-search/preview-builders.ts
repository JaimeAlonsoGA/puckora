import type { CatalogItemResult } from '@puckora/sp-api'
import { getFeesEstimatesBatch } from '@puckora/sp-api'
import { SCRAPE_PRODUCT_STATUS, type ScrapedListing } from '@puckora/scraper-core'
import type { AmazonProductInsert } from '@puckora/types'
import { buildAmazonProductUrl } from '@/constants/amazon-marketplace'
import {
    KEYWORD_SEARCH_ERROR_MESSAGE,
    SearchListingSnapshotSchema,
    type SearchListingSnapshot,
} from './contracts'

export type FeeEstimateMap = Awaited<ReturnType<typeof getFeesEstimatesBatch>>

export function buildPreviewListing(
    listing: Pick<SearchListingSnapshot, 'asin' | 'rank' | 'name' | 'price' | 'rating' | 'review_count' | 'product_url'>,
): ScrapedListing {
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

export function mergePreviewListing(
    asin: string,
    rank: number,
    marketplace: string,
    parsed: CatalogItemResult | null,
    scraped: SearchListingSnapshot | undefined,
): SearchListingSnapshot {
    return SearchListingSnapshotSchema.parse({
        asin,
        rank,
        name: parsed?.title ?? scraped?.name ?? asin,
        price: parsed?.list_price ?? scraped?.price ?? null,
        rating: scraped?.rating ?? null,
        review_count: scraped?.review_count ?? null,
        product_url: scraped?.product_url ?? buildAmazonProductUrl(marketplace, asin),
        main_image_url: parsed?.main_image_url ?? scraped?.main_image_url ?? null,
    })
}

export function buildScrapedProductInsert(listing: SearchListingSnapshot): AmazonProductInsert {
    return {
        asin: listing.asin,
        title: listing.name,
        price: listing.price ?? null,
        rating: listing.rating ?? null,
        review_count: listing.review_count ?? null,
        main_image_url: listing.main_image_url,
        product_url: listing.product_url,
        bullet_points: [],
        scrape_status: SCRAPE_PRODUCT_STATUS.SCRAPED,
        updated_at: new Date().toISOString(),
    }
}

export async function getFeeEstimateMap(
    listings: SearchListingSnapshot[],
    catalogMap: Map<string, CatalogItemResult | null>,
    marketplaceId: string,
): Promise<FeeEstimateMap> {
    const pricedItems = listings.flatMap((listing) => {
        const price = catalogMap.get(listing.asin)?.list_price ?? listing.price
        if (typeof price !== 'number' || price <= 0) return []
        return [{ asin: listing.asin, price }]
    })

    if (pricedItems.length === 0) return new Map()

    try {
        return await getFeesEstimatesBatch(pricedItems, { marketplaceId })
    } catch (err) {
        console.error('[keyword-search] getFeesEstimatesBatch failed:', err)
        return new Map()
    }
}

export function getKeywordSearchItemErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage
}

export function getKeywordSearchFailureMessage(): string {
    return KEYWORD_SEARCH_ERROR_MESSAGE.SEARCH_FAILED
}