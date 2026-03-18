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
} from '@/services/products'

/**
 * Fetch a product by ASIN. Deduplicated per request.
 */
export const cachedGetProductByAsin = cache(async (asin: string) => {
    const db = createFlyioDb()
    return getAmazonProductByAsin(db, asin)
})

/**
 * Fetch products pending enrichment. Used by background cron endpoint.
 * Not deduplicated (always fresh).
 */
export async function getStaleProducts(limit = 50) {
    const db = createFlyioDb()
    return getProductsNeedingEnrichment(db, limit)
}
