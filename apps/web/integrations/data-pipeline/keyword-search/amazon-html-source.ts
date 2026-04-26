import { SP_API_MARKETPLACE_ID } from '@puckora/sp-api'
import { parseProducts, type ScrapedListing } from '@puckora/scraper-core'
import { buildAmazonProductUrl, buildAmazonSearchUrl } from '@/constants/amazon-marketplace'
import { KEYWORD_SEARCH_PIPELINE_ERRORS } from '@/constants/api'
import { fetchAmazonPage, AmazonFetchError } from '../amazon-fetch'
import {
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
    // Fetch pages 1–3 in parallel. Pages 2 and 3 are optional: if either fails
    // we continue with the pages that succeeded.  Page 1 is mandatory.
    const [result1, result2, result3] = await Promise.allSettled([
        fetchAmazonPage(buildAmazonSearchUrl(keyword, marketplace, 1)),
        fetchAmazonPage(buildAmazonSearchUrl(keyword, marketplace, 2)),
        fetchAmazonPage(buildAmazonSearchUrl(keyword, marketplace, 3)),
    ])

    // Page 1 is required — surface its error to the caller if it failed.
    if (result1.status === 'rejected') {
        const status = result1.reason instanceof AmazonFetchError ? result1.reason.status : null
        throw new Error(`${KEYWORD_SEARCH_PIPELINE_ERRORS.HTML_SEARCH_FAILED}: ${status ?? 'network error'}`)
    }

    if (result2.status === 'rejected') {
        console.warn('[keyword-search] page 2 fetch failed (continuing without page 2):', result2.reason)
    }
    if (result3.status === 'rejected') {
        console.warn('[keyword-search] page 3 fetch failed (continuing without page 3):', result3.reason)
    }

    const page1Listings = parseProducts(result1.value).map((l) => buildSearchListingSnapshot(l, result1.value, marketplace))
    const page2Listings =
        result2.status === 'fulfilled'
            ? parseProducts(result2.value).map((l) => buildSearchListingSnapshot(l, result2.value, marketplace))
            : []
    const page3Listings =
        result3.status === 'fulfilled'
            ? parseProducts(result3.value).map((l) => buildSearchListingSnapshot(l, result3.value, marketplace))
            : []

    // Deduplicate by ASIN across all pages (sponsored products repeat across pages).
    // BPM-bearing entry wins when multiple pages carry the same ASIN.
    const byAsin = new Map<string, SearchListingSnapshot>()
    for (const listing of [...page1Listings, ...page2Listings, ...page3Listings]) {
        const existing = byAsin.get(listing.asin)
        if (!existing || (listing.bought_past_month !== null && existing.bought_past_month === null)) {
            byAsin.set(listing.asin, listing)
        }
    }
    return [...byAsin.values()]
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