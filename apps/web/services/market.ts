/**
 * Supabase service layer — Amazon categories.
 *
 * Only amazon_categories exists in the current DB schema.
 * Other market data tables (trending_products, market_opportunities,
 * fba_fees_cache) are not yet implemented — add here when migrations land.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

import type {
    AmazonCategory,
    AmazonCategoryInsert,
    AmazonCategoryUpdate,
} from '@puckora/types'

// ---------------------------------------------------------------------------
// Amazon categories
// ---------------------------------------------------------------------------

export async function getCategoryById(
    supabase: SupabaseInstance,
    id: string,
): Promise<AmazonCategory | null> {
    const { data, error } = await supabase
        .from('amazon_categories')
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (error) throw new Error(`getCategoryById failed: ${error.message}`)
    return data as AmazonCategory | null
}

export async function getCategoriesByMarketplace(
    supabase: SupabaseInstance,
    marketplace: string,
    onlyLeaf = false,
): Promise<AmazonCategory[]> {
    let query = supabase
        .from('amazon_categories')
        .select('*')
        .eq('marketplace', marketplace)
        .order('full_path', { ascending: true })

    if (onlyLeaf) query = query.eq('is_leaf', true)

    const { data, error } = await query
    if (error) throw new Error(`getCategoriesByMarketplace failed: ${error.message}`)
    return data as AmazonCategory[]
}

export async function searchCategories(
    supabase: SupabaseInstance,
    query: string,
    marketplace: string,
    limit = 20,
): Promise<AmazonCategory[]> {
    const { data, error } = await supabase.rpc('search_categories', {
        p_query: query,
        p_marketplace: marketplace,
        p_limit: limit,
    })

    if (error) throw new Error(`searchCategories failed: ${error.message}`)
    return data as AmazonCategory[]
}

export async function upsertCategory(
    supabase: SupabaseInstance,
    category: AmazonCategoryInsert,
): Promise<AmazonCategory> {
    const { data, error } = await supabase
        .from('amazon_categories')
        .upsert(category, { onConflict: 'id' })
        .select('*')
        .single()

    if (error) throw new Error(`upsertCategory failed: ${error.message}`)
    return data as AmazonCategory
}

export async function updateCategoryStatus(
    supabase: SupabaseInstance,
    id: string,
    update: Pick<AmazonCategoryUpdate, 'scrape_status' | 'last_scraped_at'>,
): Promise<void> {
    const { error } = await supabase
        .from('amazon_categories')
        .update(update)
        .eq('id', id)

    if (error) throw new Error(`updateCategoryStatus failed: ${error.message}`)
}
