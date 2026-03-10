/**
 * Data pipeline: Amazon product details.
 *
 * Fetches full product data from Apify (axesso_data/amazon-product-details-scraper)
 * and upserts into the amazon_products table.
 *
 * Server-side only — call from Route Handlers or Server Actions.
 */

import { runApifyActor } from '@/integrations/apify/client'
import { APIFY_ACTOR_ID } from '@/integrations/apify/types'
import type {
    AmazonProductDetailsInput,
    AmazonProductDetailsOutput,
} from '@/integrations/apify/types'
import { upsertAmazonProduct } from '@/services/products'
import type { AmazonProductInsert } from '@puckora/types'
import { parseDomainFromUrl } from '@puckora/utils'
import { parseRatingNumber } from './utils'
import { SCRAPE_PRODUCT_STATUS } from '@puckora/scraper-core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

function normaliseProductInsert(raw: AmazonProductDetailsOutput): AmazonProductInsert {
    return {
        asin: raw.asin,
        title: raw.title ?? null,
        brand: raw.manufacturer ?? null,
        manufacturer: raw.manufacturer ?? null,
        price: raw.price ?? null,
        main_image_url: raw.mainImage?.imageUrl ?? null,
        rating: parseRatingNumber(raw.productRating),
        review_count: raw.countReview ?? null,
        bullet_points: raw.features?.length > 0 ? raw.features : null,
        product_url: raw.url
            ? `https://www.amazon.${parseDomainFromUrl(raw.url) === 'US' ? 'com' : 'co.uk'}/dp/${raw.asin}`
            : null,
        scrape_status: SCRAPE_PRODUCT_STATUS.SCRAPED,
        updated_at: new Date().toISOString(),
    }
}

export interface FetchAmazonProductResult {
    asin: string
    status: 'upserted' | 'not_found' | 'error'
    error?: string
}

/**
 * Fetch one Amazon product by URL, normalise, and upsert into amazon_products.
 */
export async function fetchAndPersistAmazonProduct(
    supabase: SupabaseInstance,
    productUrl: string,
): Promise<FetchAmazonProductResult> {
    let raw: AmazonProductDetailsOutput | null = null

    try {
        const results = await runApifyActor<AmazonProductDetailsInput, AmazonProductDetailsOutput>(
            APIFY_ACTOR_ID.amazonProductDetails,
            { urls: [productUrl] },
        )
        raw = results[0] ?? null
    } catch (err) {
        return {
            asin: '',
            status: 'error',
            error: err instanceof Error ? err.message : 'Apify actor failed',
        }
    }

    if (!raw?.asin) {
        return { asin: '', status: 'not_found' }
    }

    try {
        await upsertAmazonProduct(supabase, normaliseProductInsert(raw))
        return { asin: raw.asin, status: 'upserted' }
    } catch (err) {
        return {
            asin: raw.asin,
            status: 'error',
            error: err instanceof Error ? err.message : 'DB upsert failed',
        }
    }
}
