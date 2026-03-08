/**
 * Server-side React.cache wrappers for product data.
 *
 * Deduplicate identical fetches within a single React render tree.
 * Only import these from Server Components / Server Actions.
 */

import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import type { Marketplace } from '@puckora/types'
import {
    getProductByAsin,
    getProductById,
    getProductWithDetails,
    getTrackedProductsByUser,
    getProductsNeedingRefresh,
} from '@/lib/services/products'

/**
 * Fetch a product by ASIN + marketplace. Deduplicated per request.
 */
export const cachedGetProductByAsin = cache(
    async (asin: string, marketplace: string) => {
        const supabase = await createServerClient()
        return getProductByAsin(supabase, asin, marketplace as Marketplace)
    },
)

/**
 * Fetch a product by internal UUID. Deduplicated per request.
 */
export const cachedGetProductById = cache(async (productId: string) => {
    const supabase = await createServerClient()
    return getProductById(supabase, productId)
})

/**
 * Fetch a product with its details by internal product UUID. Deduplicated per request.
 */
export const cachedGetProductWithDetails = cache(async (productId: string) => {
    const supabase = await createServerClient()
    return getProductWithDetails(supabase, productId)
})

/**
 * Fetch tracked products for a user. Deduplicated per request.
 */
export const cachedGetTrackedProducts = cache(async (userId: string) => {
    const supabase = await createServerClient()
    return getTrackedProductsByUser(supabase, userId)
})

/**
 * Fetch products that need a data refresh. Used by background cron endpoint.
 * Not deduplicated (always fresh).
 */
export async function getStaleProducts(limit = 50) {
    const supabase = await createServerClient()
    return getProductsNeedingRefresh(supabase, limit)
}
