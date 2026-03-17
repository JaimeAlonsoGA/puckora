/**
 * Server-side React.cache wrappers for amazon_keywords.
 *
 * Deduplicates identical fetches within a single React render tree.
 * Import only from Server Components or Server Actions.
 */
import 'server-only'

import { cache } from 'react'
import { createServerClient } from '@/integrations/supabase/server'
import { getKeyword, getProductsForKeyword } from '@/services/keywords'
import type { ProductFinancial } from '@puckora/types'

/**
 * Return the ordered ProductFinancial list for the most recent search of
 * this keyword + marketplace pair. Returns [] when no search has run yet.
 *
 * Deduplicated per request via React.cache().
 */
export const getCachedKeywordResults = cache(async (
    keyword: string,
    marketplace: string,
): Promise<ProductFinancial[]> => {
    const supabase = await createServerClient()
    const keywordRow = await getKeyword(supabase, keyword, marketplace)
    if (!keywordRow) return []
    return getProductsForKeyword(supabase, keywordRow.id)
})
