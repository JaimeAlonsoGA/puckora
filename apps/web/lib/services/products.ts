/**
 * Supabase service layer — Amazon products & product details.
 *
 * All functions accept a typed Supabase client instance so they work from
 * both server components (createServerClient) and Route Handlers (admin).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

import type {
    Product,
    ProductInsert,
    ProductUpdate,
    ProductDetail,
    ProductDetailInsert,
    ProductHistory,
} from '@puckora/types'
import type { Marketplace } from '@puckora/types'

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getProductByAsin(
    supabase: SupabaseInstance,
    asin: string,
    marketplace: Marketplace,
): Promise<Product | null> {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('asin', asin)
        .eq('marketplace', marketplace)
        .maybeSingle()

    if (error) throw new Error(`getProductByAsin failed: ${error.message}`)
    return data as Product | null
}

export async function getProductById(
    supabase: SupabaseInstance,
    id: string,
): Promise<Product | null> {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (error) throw new Error(`getProductById failed: ${error.message}`)
    return data as Product | null
}

export async function getProductWithDetails(
    supabase: SupabaseInstance,
    id: string,
): Promise<(Product & { product_details: ProductDetail | null }) | null> {
    const { data, error } = await supabase
        .from('products')
        .select('*, product_details(*)')
        .eq('id', id)
        .maybeSingle()

    if (error) throw new Error(`getProductWithDetails failed: ${error.message}`)
    return data
}

export async function upsertProduct(
    supabase: SupabaseInstance,
    product: ProductInsert,
): Promise<Product> {
    const { data, error } = await supabase
        .from('products')
        .upsert(product, { onConflict: 'asin,marketplace' })
        .select('*')
        .single()

    if (error) throw new Error(`upsertProduct failed: ${error.message}`)
    return data as Product
}

export async function upsertProducts(
    supabase: SupabaseInstance,
    products: ProductInsert[],
): Promise<Product[]> {
    if (products.length === 0) return []
    const { data, error } = await supabase
        .from('products')
        .upsert(products, { onConflict: 'asin,marketplace' })
        .select('*')

    if (error) throw new Error(`upsertProducts failed: ${error.message}`)
    return data as Product[]
}

export async function updateProduct(
    supabase: SupabaseInstance,
    id: string,
    update: ProductUpdate,
): Promise<Product> {
    const { data, error } = await supabase
        .from('products')
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()

    if (error) throw new Error(`updateProduct failed: ${error.message}`)
    return data as Product
}

export async function getProductsNeedingRefresh(
    supabase: SupabaseInstance,
    limit = 50,
): Promise<Product[]> {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .lt('needs_refresh_at', new Date().toISOString())
        .order('needs_refresh_at', { ascending: true })
        .limit(limit)

    if (error) throw new Error(`getProductsNeedingRefresh failed: ${error.message}`)
    return data as Product[]
}

// ---------------------------------------------------------------------------
// Product details (1:1 with products)
// ---------------------------------------------------------------------------

export async function getProductDetails(
    supabase: SupabaseInstance,
    productId: string,
): Promise<ProductDetail | null> {
    const { data, error } = await supabase
        .from('product_details')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle()

    if (error) throw new Error(`getProductDetails failed: ${error.message}`)
    return data as ProductDetail | null
}

export async function upsertProductDetails(
    supabase: SupabaseInstance,
    details: ProductDetailInsert,
): Promise<ProductDetail> {
    const { data, error } = await supabase
        .from('product_details')
        .upsert(
            { ...details, updated_at: new Date().toISOString() },
            { onConflict: 'product_id' },
        )
        .select('*')
        .single()

    if (error) throw new Error(`upsertProductDetails failed: ${error.message}`)
    return data as ProductDetail
}

// ---------------------------------------------------------------------------
// Product history snapshots
// ---------------------------------------------------------------------------

export async function insertProductHistorySnapshot(
    supabase: SupabaseInstance,
    snapshot: Omit<ProductHistory, 'id' | 'snapshot_at'> & { snapshot_at?: string },
): Promise<ProductHistory> {
    const { data, error } = await supabase
        .from('product_history')
        .insert({
            ...snapshot,
            snapshot_at: snapshot.snapshot_at ?? new Date().toISOString(),
        })
        .select('*')
        .single()

    if (error) throw new Error(`insertProductHistorySnapshot failed: ${error.message}`)
    return data as ProductHistory
}

export async function getProductHistory(
    supabase: SupabaseInstance,
    productId: string,
    limitDays = 90,
): Promise<ProductHistory[]> {
    const since = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
        .from('product_history')
        .select('*')
        .eq('product_id', productId)
        .gte('snapshot_at', since)
        .order('snapshot_at', { ascending: true })

    if (error) throw new Error(`getProductHistory failed: ${error.message}`)
    return data as ProductHistory[]
}

// ---------------------------------------------------------------------------
// Tracked products
// ---------------------------------------------------------------------------

export async function getTrackedProductsByUser(
    supabase: SupabaseInstance,
    userId: string,
): Promise<Array<{ id: string; product_id: string; stage: string }>> {
    const { data, error } = await supabase
        .from('tracked_products')
        .select('id, product_id, stage, products(asin, title, marketplace, price, rating, bsr, main_image_url)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) throw new Error(`getTrackedProductsByUser failed: ${error.message}`)
    return data
}

export async function trackProduct(
    supabase: SupabaseInstance,
    userId: string,
    productId: string,
    stage = 'researching',
): Promise<void> {
    const { error } = await supabase
        .from('tracked_products')
        .upsert(
            { user_id: userId, product_id: productId, stage, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,product_id' },
        )
    if (error) throw new Error(`trackProduct failed: ${error.message}`)
}
