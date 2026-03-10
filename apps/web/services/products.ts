/**
 * Supabase service layer — Amazon products & category ranks.
 *
 * The DB schema is product-centric: ASIN is the global primary key (Amazon
 * ASINs are globally unique). Marketplace context lives in amazon_categories.
 *
 * All functions accept a typed Supabase client so they work from both
 * Server Components (createServerClient) and Route Handlers (admin client).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

import type {
    AmazonProduct,
    AmazonProductInsert,
    AmazonProductUpdate,
    ProductCategoryRank,
    ProductCategoryRankInsert,
} from '@puckora/types'

// ---------------------------------------------------------------------------
// Amazon products
// ---------------------------------------------------------------------------

export async function getAmazonProductByAsin(
    supabase: SupabaseInstance,
    asin: string,
): Promise<AmazonProduct | null> {
    const { data, error } = await supabase
        .from('amazon_products')
        .select('*')
        .eq('asin', asin)
        .maybeSingle()

    if (error) throw new Error(`getAmazonProductByAsin failed: ${error.message}`)
    return data as AmazonProduct | null
}

export async function upsertAmazonProduct(
    supabase: SupabaseInstance,
    product: AmazonProductInsert,
): Promise<AmazonProduct> {
    const { data, error } = await supabase
        .from('amazon_products')
        .upsert(
            { ...product, updated_at: new Date().toISOString() },
            { onConflict: 'asin' },
        )
        .select('*')
        .single()

    if (error) throw new Error(`upsertAmazonProduct failed: ${error.message}`)
    return data as AmazonProduct
}

export async function upsertAmazonProducts(
    supabase: SupabaseInstance,
    products: AmazonProductInsert[],
): Promise<AmazonProduct[]> {
    if (products.length === 0) return []
    const now = new Date().toISOString()
    const { data, error } = await supabase
        .from('amazon_products')
        .upsert(
            products.map((p) => ({ ...p, updated_at: now })),
            { onConflict: 'asin' },
        )
        .select('*')

    if (error) throw new Error(`upsertAmazonProducts failed: ${error.message}`)
    return data as AmazonProduct[]
}

export async function updateAmazonProduct(
    supabase: SupabaseInstance,
    asin: string,
    update: AmazonProductUpdate,
): Promise<AmazonProduct> {
    const { data, error } = await supabase
        .from('amazon_products')
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq('asin', asin)
        .select('*')
        .single()

    if (error) throw new Error(`updateAmazonProduct failed: ${error.message}`)
    return data as AmazonProduct
}

/**
 * Returns products that have been scraped but not yet enriched via SP-API.
 * Used by background cron / enrichment jobs.
 */
export async function getProductsNeedingEnrichment(
    supabase: SupabaseInstance,
    limit = 50,
): Promise<AmazonProduct[]> {
    const { data, error } = await supabase
        .from('amazon_products')
        .select('*')
        .eq('scrape_status', 'scraped')
        .is('enriched_at', null)
        .order('created_at', { ascending: true })
        .limit(limit)

    if (error) throw new Error(`getProductsNeedingEnrichment failed: ${error.message}`)
    return data as AmazonProduct[]
}

// ---------------------------------------------------------------------------
// Product category ranks
// ---------------------------------------------------------------------------

export async function upsertProductCategoryRank(
    supabase: SupabaseInstance,
    rank: ProductCategoryRankInsert,
): Promise<ProductCategoryRank> {
    const { data, error } = await supabase
        .from('product_category_ranks')
        .upsert(rank, { onConflict: 'asin,category_id,rank_type' })
        .select('*')
        .single()

    if (error) throw new Error(`upsertProductCategoryRank failed: ${error.message}`)
    return data as ProductCategoryRank
}

export async function getProductCategoryRanks(
    supabase: SupabaseInstance,
    asin: string,
): Promise<ProductCategoryRank[]> {
    const { data, error } = await supabase
        .from('product_category_ranks')
        .select('*')
        .eq('asin', asin)
        .order('observed_at', { ascending: false })

    if (error) throw new Error(`getProductCategoryRanks failed: ${error.message}`)
    return data as ProductCategoryRank[]
}
