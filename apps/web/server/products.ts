/**
 * Server-side React.cache wrappers for Amazon product data.
 *
 * Deduplicate identical fetches within a single React render tree.
 * Only import these from Server Components / Server Actions.
 */
import 'server-only'

import { cache } from 'react'
import { createFlyioDb } from '@/integrations/flyio/client'
import {
    getAmazonProductByAsin,
    getProductsNeedingEnrichment,
    discoverProducts,
} from '@/services/products'
import type { DiscoverFilters } from '@/schemas/discover'

/**
 * Fetch a product by ASIN. Deduplicated per request.
 */
export const cachedGetProductByAsin = cache(async (asin: string) => {
    const db = createFlyioDb()
    return getAmazonProductByAsin(db, asin)
})

/**
 * Fetch products from the product_financials view matching filters.
 * Used by /search/discover. Deduplicated per request.
 */
export const getCachedDiscoverProducts = cache(async (filters: DiscoverFilters) => {
    const db = createFlyioDb()
    return discoverProducts(db, filters)
})

/**
 * Fetch products pending enrichment. Used by background cron endpoint.
 * Not deduplicated (always fresh).
 */
export async function getStaleProducts(limit = 50) {
    const db = createFlyioDb()
    return getProductsNeedingEnrichment(db, limit)
}
