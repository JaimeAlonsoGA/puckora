import type { AmazonProductDetailsOutput, AmazonSearchOutput } from '@/integrations/apify/types'
import { parseRatingNumber } from './utils'
import { SCRAPE_PRODUCT_STATUS, type ScrapedListing } from '@puckora/scraper-core'
import type { AmazonProductInsert } from '@puckora/types'
import { AmazonProductInsertSchema } from '@puckora/types/schemas'
import { coerceNumber, parseDomainFromUrl } from '@puckora/utils'

function parsePriceValue(value: number | string | null | undefined): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null
    }

    if (typeof value !== 'string') return null

    const normalized = Number(value.replace(/[^0-9.]/g, ''))
    return Number.isFinite(normalized) ? normalized : null
}

function parseAmazonProductInsert(product: AmazonProductInsert): AmazonProductInsert {
    return AmazonProductInsertSchema.parse(product)
}

export function normalizeScrapedListingToAmazonProductInsert(listing: ScrapedListing): AmazonProductInsert {
    return parseAmazonProductInsert({
        asin: listing.asin,
        title: listing.name ?? null,
        price: parsePriceValue(listing.price),
        rating: coerceNumber(listing.rating),
        review_count: coerceNumber(listing.review_count),
        product_url: listing.product_url ?? null,
        scrape_status: SCRAPE_PRODUCT_STATUS.SCRAPED,
        updated_at: new Date().toISOString(),
    })
}

export function normalizeApifySearchResultToAmazonProductInsert(item: AmazonSearchOutput): AmazonProductInsert | null {
    if (!item.asin) return null

    return parseAmazonProductInsert({
        asin: item.asin,
        title: item.productDescription ?? null,
        manufacturer: item.manufacturer ?? null,
        brand: item.manufacturer ?? null,
        price: parsePriceValue(item.price),
        main_image_url: item.imgUrl ?? null,
        rating: parseRatingNumber(item.productRating),
        review_count: item.countReview ?? null,
        scrape_status: SCRAPE_PRODUCT_STATUS.SCRAPED,
        updated_at: new Date().toISOString(),
    })
}

export function normalizeApifyProductDetailsToAmazonProductInsert(raw: AmazonProductDetailsOutput): AmazonProductInsert {
    const domain = raw.url ? parseDomainFromUrl(raw.url) : null

    return parseAmazonProductInsert({
        asin: raw.asin,
        title: raw.title ?? null,
        brand: raw.manufacturer ?? null,
        manufacturer: raw.manufacturer ?? null,
        price: parsePriceValue(raw.price),
        main_image_url: raw.mainImage?.imageUrl ?? null,
        rating: parseRatingNumber(raw.productRating),
        review_count: raw.countReview ?? null,
        bullet_points: raw.features?.length ? raw.features : null,
        product_url: raw.url
            ? `https://www.amazon.${domain === 'US' ? 'com' : 'co.uk'}/dp/${raw.asin}`
            : null,
        scrape_status: SCRAPE_PRODUCT_STATUS.SCRAPED,
        updated_at: new Date().toISOString(),
    })
}