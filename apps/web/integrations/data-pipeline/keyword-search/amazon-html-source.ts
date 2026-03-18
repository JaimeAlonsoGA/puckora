import { SP_API_MARKETPLACE_ID } from '@puckora/sp-api'
import { parseProducts, type ScrapedListing } from '@puckora/scraper-core'
import { buildAmazonProductUrl, buildAmazonSearchUrl } from '@/constants/amazon-marketplace'
import {
    KEYWORD_SEARCH_ERROR_MESSAGE,
    KEYWORD_SEARCH_FETCH_HEADERS,
    SearchListingSnapshotSchema,
    type SearchListingSnapshot,
} from './contracts'

export function getMarketplaceId(marketplace: string): string {
    return SP_API_MARKETPLACE_ID[marketplace.toUpperCase()] ?? SP_API_MARKETPLACE_ID.US!
}

export async function fetchSearchListings(
    keyword: string,
    marketplace: string,
): Promise<SearchListingSnapshot[]> {
    const response = await fetch(buildAmazonSearchUrl(keyword, marketplace), {
        headers: KEYWORD_SEARCH_FETCH_HEADERS,
        cache: 'no-store',
    })

    if (!response.ok) {
        throw new Error(`${KEYWORD_SEARCH_ERROR_MESSAGE.HTML_SEARCH_FAILED}: ${response.status}`)
    }

    const html = await response.text()
    return parseProducts(html).map((listing) => buildSearchListingSnapshot(listing, html, marketplace))
}

function buildSearchListingSnapshot(
    listing: ScrapedListing,
    html: string,
    marketplace: string,
): SearchListingSnapshot {
    return SearchListingSnapshotSchema.parse({
        ...listing,
        product_url: buildAmazonProductUrl(marketplace, listing.asin),
        main_image_url: extractMainImageUrl(html, listing.asin),
    })
}

function extractMainImageUrl(html: string, asin: string): string | null {
    const marker = `data-asin="${asin}"`
    const start = html.indexOf(marker)
    if (start === -1) return null

    const end = html.indexOf('data-asin="', start + marker.length)
    const block = html.slice(start, end === -1 ? start + 12_000 : end)
    const match = block.match(/<img[^>]+(?:src|data-src|data-image-source-density-high)="([^"]+)"[^>]*>/i)
    return match?.[1] ?? null
}