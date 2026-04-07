/**
 * Server-side React.cache wrapper for a single amazon product.
 *
 * Deduplicates identical ASIN fetches within a single React render tree.
 * Import only from Server Components or Server Actions.
 */
import 'server-only'

import { cache } from 'react'
import { createFlyioDb } from '@/integrations/flyio/client'
import { getProductByAsin } from '@/services/amazon-product'
import type { ProductFinancial } from '@puckora/types'

/**
 * Return a ProductFinancial for the given ASIN, or null if not found.
 * Marketplace is accepted for future locale-specific enrichment (not yet used).
 */
export const getCachedProductByAsin = cache(async (
    asin: string,
    _marketplace: string,
): Promise<ProductFinancial | null> => {
    const db = createFlyioDb()
    return getProductByAsin(db, asin)
})
