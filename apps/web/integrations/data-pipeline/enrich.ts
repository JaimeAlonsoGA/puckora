/**
 * Data pipeline: batch SP-API enrichment for scraped ASINs.
 *
 * Called by the /api/scrape/enrich route handler via after() so it runs
 * in a background task without blocking the HTTP response.
 *
 * Fetches catalogue metadata (title, brand, images, sales ranks) for a list
 * of ASINs and upserts each row in amazon_products, upgrading
 * scrape_status from 'scraped' to 'enriched'.
 *
 * Only the US marketplace is supported currently. Extend getMarketplaceId()
 * to map marketplace codes when multi-marketplace enrichment is needed.
 */

import { getCatalogItem } from '@/integrations/sp-api/client'
import { upsertAmazonProduct } from '@/services/products'
import type { AmazonProductInsert } from '@puckora/types'
import type { CatalogItem } from '@/integrations/sp-api/types'
import { SCRAPE_PRODUCT_STATUS } from '@puckora/scraper-core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert an Amazon SP-API CatalogItem to an AmazonProductInsert. */
function normaliseCatalogItem(catalog: CatalogItem): AmazonProductInsert {
    // summaries[0] holds the human-readable title and brand
    const summary = catalog.summaries?.[0]
    // images[0].images[0] gives the first image variant for the first marketplace
    const primaryImage = catalog.images?.[0]?.images?.[0]

    return {
        asin: catalog.asin,
        title: summary?.itemName ?? null,
        brand: summary?.brand ?? null,
        manufacturer: summary?.manufacturer ?? null,
        main_image_url: (primaryImage as { link?: string } | undefined)?.link ?? null,
        scrape_status: SCRAPE_PRODUCT_STATUS.ENRICHED,
        updated_at: new Date().toISOString(),
    }
}

/** Map a puckora marketplace code ('US', 'UK', etc.) to an SP-API marketplace ID. */
function getMarketplaceId(marketplace = 'US'): string {
    const MAP: Record<string, string> = {
        US: 'ATVPDKIKX0DER',
        UK: 'A1F83G8C2ARO7P',
        DE: 'A1PA6795UKMFR9',
        FR: 'A13V1IB3VIYZZH',
        IT: 'APJ6JRA9NG5V4',
        ES: 'A1RKKUPIHCS9HS',
        CA: 'A2EUQ1WTGCTBG2',
        AU: 'A39IBJ37TRP1C6',
        JP: 'A1VC38T7YXB528',
    }
    return MAP[marketplace] ?? MAP.US!
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface EnrichAsinResult {
    asin: string
    status: 'enriched' | 'not_found' | 'error'
    error?: string
}

/**
 * Enrich a batch of ASINs with SP-API catalogue data.
 *
 * Processes ASINs sequentially to respect SP-API rate limits (handled by
 * acquireRateToken inside getCatalogItem). Failed ASINs are logged and
 * skipped — the batch continues.
 *
 * @param supabase - Admin Supabase client (bypasses RLS)
 * @param asins    - Array of 10-character Amazon ASINs
 * @param marketplace - Puckora marketplace code, defaults to 'US'
 */
export async function enrichAsinBatch(
    supabase: SupabaseInstance,
    asins: string[],
    marketplace = 'US',
): Promise<EnrichAsinResult[]> {
    const marketplaceId = getMarketplaceId(marketplace)
    const results: EnrichAsinResult[] = []

    for (const asin of asins) {
        try {
            const catalog = await getCatalogItem({
                asin,
                marketplaceIds: [marketplaceId],
                includedData: ['summaries', 'images'],
            })

            await upsertAmazonProduct(supabase, normaliseCatalogItem(catalog))
            results.push({ asin, status: 'enriched' })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            // 404 from SP-API means the ASIN doesn't exist in that marketplace
            const isNotFound = message.includes('404')
            results.push({
                asin,
                status: isNotFound ? 'not_found' : 'error',
                error: isNotFound ? undefined : message,
            })
        }
    }

    return results
}
