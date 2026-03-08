/**
 * Supabase service layer — Market data.
 * Covers: fba_fees_cache, market_opportunities, trending_products, amazon_categories
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

import type {
    AmazonCategory,
    FbaFeeCache,
    FbaFeeCacheInsert,
    MarketOpportunity,
    TrendingProduct,
    TrendingProductInsert,
    TrendingProductUpdate,
} from '@puckora/types'
import type { Marketplace } from '@puckora/types'

// ---------------------------------------------------------------------------
// FBA fees cache
// ---------------------------------------------------------------------------

export async function getFbaFeesFromCache(
    supabase: SupabaseInstance,
    asin: string,
    marketplace: Marketplace,
): Promise<FbaFeeCache | null> {
    const { data, error } = await supabase
        .from('fba_fees_cache')
        .select('*')
        .eq('asin', asin)
        .eq('marketplace', marketplace)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) throw new Error(`getFbaFeesFromCache failed: ${error.message}`)
    return data as FbaFeeCache | null
}

export async function upsertFbaFeesCache(
    supabase: SupabaseInstance,
    fees: FbaFeeCacheInsert,
): Promise<FbaFeeCache> {
    const { data, error } = await supabase
        .from('fba_fees_cache')
        .insert(fees)
        .select('*')
        .single()

    if (error) throw new Error(`upsertFbaFeesCache failed: ${error.message}`)
    return data as FbaFeeCache
}

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

export async function searchCategories(
    supabase: SupabaseInstance,
    query: string,
    marketplace: Marketplace,
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

// ---------------------------------------------------------------------------
// Market opportunities
// ---------------------------------------------------------------------------

export async function getMarketOpportunities(
    supabase: SupabaseInstance,
    marketplace: Marketplace,
    limit = 20,
): Promise<MarketOpportunity[]> {
    const { data, error } = await supabase
        .from('market_opportunities')
        .select('*')
        .eq('marketplace', marketplace)
        .gt('valid_until', new Date().toISOString())
        .order('score', { ascending: false })
        .limit(limit)

    if (error) throw new Error(`getMarketOpportunities failed: ${error.message}`)
    return data as MarketOpportunity[]
}

// ---------------------------------------------------------------------------
// Trending products
// ---------------------------------------------------------------------------

export async function getTrendingProducts(
    supabase: SupabaseInstance,
    marketplace: string,
    limit = 50,
): Promise<TrendingProduct[]> {
    const { data, error } = await supabase
        .from('trending_products')
        .select('*')
        .eq('marketplace', marketplace)
        .order('opportunity_score', { ascending: false })
        .limit(limit)

    if (error) throw new Error(`getTrendingProducts failed: ${error.message}`)
    return data as TrendingProduct[]
}

export async function upsertTrendingProduct(
    supabase: SupabaseInstance,
    product: TrendingProductInsert,
): Promise<TrendingProduct> {
    const { data, error } = await supabase
        .from('trending_products')
        .upsert(
            { ...product, refreshed_at: new Date().toISOString() },
            { onConflict: 'asin,marketplace' },
        )
        .select('*')
        .single()

    if (error) throw new Error(`upsertTrendingProduct failed: ${error.message}`)
    return data as TrendingProduct
}

export async function upsertTrendingProducts(
    supabase: SupabaseInstance,
    products: TrendingProductInsert[],
): Promise<TrendingProduct[]> {
    if (products.length === 0) return []
    const { data, error } = await supabase
        .from('trending_products')
        .upsert(
            products.map((p) => ({ ...p, refreshed_at: new Date().toISOString() })),
            { onConflict: 'asin,marketplace' },
        )
        .select('*')

    if (error) throw new Error(`upsertTrendingProducts failed: ${error.message}`)
    return data as TrendingProduct[]
}

// ---------------------------------------------------------------------------
// Search history
// ---------------------------------------------------------------------------

export async function logSearchHistory(
    supabase: SupabaseInstance,
    userId: string,
    query: string,
    marketplace: Marketplace,
    searchType: 'keyword' | 'asin' | 'category' | 'brand' | 'supplier',
    resultCount?: number,
    firstResultAsin?: string,
    workspaceId?: string,
): Promise<void> {
    const { error } = await supabase.from('search_history').insert({
        user_id: userId,
        query,
        marketplace,
        search_type: searchType,
        result_count: resultCount ?? null,
        first_result_asin: firstResultAsin ?? null,
        workspace_id: workspaceId ?? null,
    })
    if (error) {
        // Non-critical — log but don't throw
        console.error('logSearchHistory failed:', error.message)
    }
}
