/**
 * Server-side React.cache wrappers for supplier data.
 *
 * Deduplicate identical fetches within a single React render tree.
 * Only import these from Server Components / Server Actions.
 */

import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import {
    getSavedSuppliersByUser,
    getMatchesForProduct,
    getSupplierByAlibabaId,
    getSupplierProductsBySupplier,
} from '@/lib/services/suppliers'

/**
 * Fetch saved suppliers for a user. Deduplicated per request.
 */
export const cachedGetSavedSuppliers = cache(async (userId: string) => {
    const supabase = await createServerClient()
    return getSavedSuppliersByUser(supabase, userId)
})

/**
 * Fetch product–supplier matches for a product. Deduplicated per request.
 */
export const cachedGetMatchesForProduct = cache(async (productId: string) => {
    const supabase = await createServerClient()
    return getMatchesForProduct(supabase, productId)
})

/**
 * Fetch a supplier by Alibaba ID. Deduplicated per request.
 */
export const cachedGetSupplierByAlibabaId = cache(async (alibabaId: string) => {
    const supabase = await createServerClient()
    return getSupplierByAlibabaId(supabase, alibabaId)
})

/**
 * Fetch all products listed by a supplier. Deduplicated per request.
 */
export const cachedGetSupplierProducts = cache(async (supplierId: string) => {
    const supabase = await createServerClient()
    return getSupplierProductsBySupplier(supabase, supplierId)
})
