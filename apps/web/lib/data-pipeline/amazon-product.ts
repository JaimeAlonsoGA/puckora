import type { Json } from '@puckora/types'
/**
 * Data pipeline: Amazon product details.
 *
 * Fetches full product details from Apify (axesso_data/amazon-product-details-scraper)
 * then normalises and upserts into Supabase products + product_details tables.
 *
 * Server-side only — call from Route Handlers or Server Actions.
 */

import { runApifyActor } from '@/lib/apify/client'
import { APIFY_ACTOR_ID } from '@/lib/apify/types'
import type {
    AmazonProductDetailsInput,
    AmazonProductDetailsOutput,
} from '@/lib/apify/types'
import { upsertProduct, upsertProductDetails } from '@/lib/services/products'
import type { ProductInsert, ProductDetailInsert } from '@puckora/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

/** Map Amazon domain code to puckora marketplace code */
const DOMAIN_TO_MARKETPLACE: Record<string, string> = {
    com: 'US',
    ca: 'CA',
    com_mx: 'MX',
    co_uk: 'UK',
    de: 'DE',
    fr: 'FR',
    it: 'IT',
    es: 'ES',
    nl: 'NL',
    se: 'SE',
    pl: 'PL',
    com_tr: 'TR',
    ae: 'AE',
    sa: 'SA',
    in: 'IN',
    co_jp: 'JP',
    com_au: 'AU',
    com_sg: 'SG',
    com_br: 'BR',
}

function parseDomainCode(url: string): string {
    // Extract domain from URL: amazon.de → de, amazon.co.uk → co_uk
    const match = url.match(/amazon\.([a-z.]+)\//)
    if (!match) return 'US'
    const raw = (match[1] ?? '').replace('.', '_')
    return DOMAIN_TO_MARKETPLACE[raw] ?? 'US'
}

function parseRatingNumber(ratingStr: string | null | undefined): number | null {
    if (!ratingStr) return null
    const match = ratingStr.match(/[\d.]+/)
    return match ? parseFloat(match[0]) : null
}

function normaliseProductInsert(raw: AmazonProductDetailsOutput): ProductInsert {
    const marketplace = parseDomainCode(raw.url)
    const now = new Date().toISOString()
    // Refresh in 24 hours by default
    const needsRefreshAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    return {
        asin: raw.asin,
        title: raw.title,
        marketplace: marketplace as ProductInsert['marketplace'],
        brand: raw.manufacturer ?? null,
        price: raw.price,
        price_min: raw.price,
        price_max: raw.retailPrice,
        main_image_url: raw.mainImage?.imageUrl ?? null,
        image_urls: raw.imageUrlList.length > 0 ? raw.imageUrlList : null,
        rating: parseRatingNumber(raw.productRating),
        review_count: raw.countReview,
        is_fba: raw.fulfilledBy === 'Amazon',
        is_sold_by_amazon: raw.soldBy === 'Amazon' || raw.soldBy === 'Amazon.com',
        is_adult: false,
        is_hazmat: false,
        is_oversized: false,
        currency: 'USD',
        raw_data: raw as unknown as Json,
        scraped_at: now,
        needs_refresh_at: needsRefreshAt,
        updated_at: now,
    }
}

function normaliseProductDetailsInsert(
    productId: string,
    raw: AmazonProductDetailsOutput,
): ProductDetailInsert {
    const now = new Date().toISOString()
    return {
        product_id: productId,
        bullet_points: raw.features.length > 0 ? raw.features : null,
        description: raw.productDescription,
        fba_fee: null, // filled later by SP-API fees estimate
        referral_fee: null,
        variations: raw.variations.length > 0 ? (raw.variations as unknown as Json) : null,
        variant_asins:
            raw.variations.length > 0
                ? (raw.variations.flatMap((v) => v.values.map((val) => val.asin)) as unknown as Json)
                : null,
        has_aplus: false,
        scraped_at: now,
        updated_at: now,
    }
}

export interface FetchAmazonProductResult {
    asin: string
    productId: string
    status: 'upserted' | 'not_found' | 'error'
    error?: string
}

/**
 * Fetch one Amazon product by URL, normalise and persist to Supabase.
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
        return { asin: '', productId: '', status: 'error', error: String(err) }
    }

    if (!raw || raw.statusCode !== 200) {
        return { asin: '', productId: '', status: 'not_found' }
    }

    try {
        const productInsert = normaliseProductInsert(raw)
        const product = await upsertProduct(supabase, productInsert)
        await upsertProductDetails(supabase, normaliseProductDetailsInsert(product.id, raw))

        return { asin: product.asin, productId: product.id, status: 'upserted' }
    } catch (err) {
        return { asin: raw.asin, productId: '', status: 'error', error: String(err) }
    }
}

/**
 * Fetch multiple Amazon products by URL in parallel (max concurrency 5).
 */
export async function fetchAndPersistAmazonProducts(
    supabase: SupabaseInstance,
    productUrls: string[],
): Promise<FetchAmazonProductResult[]> {
    if (productUrls.length === 0) return []

    // Batch into chunks of 10 (actor handles arrays natively; we use one call)
    const BATCH = 10
    const results: FetchAmazonProductResult[] = []

    for (let i = 0; i < productUrls.length; i += BATCH) {
        const chunk = productUrls.slice(i, i + BATCH)
        let rawItems: AmazonProductDetailsOutput[] = []

        try {
            rawItems = await runApifyActor<AmazonProductDetailsInput, AmazonProductDetailsOutput>(
                APIFY_ACTOR_ID.amazonProductDetails,
                { urls: chunk },
            )
        } catch (err) {
            chunk.forEach(() =>
                results.push({ asin: '', productId: '', status: 'error', error: String(err) }),
            )
            continue
        }

        await Promise.all(
            rawItems.map(async (raw) => {
                if (!raw || raw.statusCode !== 200) {
                    results.push({ asin: '', productId: '', status: 'not_found' })
                    return
                }
                try {
                    const productInsert = normaliseProductInsert(raw)
                    const product = await upsertProduct(supabase, productInsert)
                    await upsertProductDetails(
                        supabase,
                        normaliseProductDetailsInsert(product.id, raw),
                    )
                    results.push({ asin: product.asin, productId: product.id, status: 'upserted' })
                } catch (err) {
                    results.push({
                        asin: raw.asin,
                        productId: '',
                        status: 'error',
                        error: String(err),
                    })
                }
            }),
        )
    }

    return results
}
