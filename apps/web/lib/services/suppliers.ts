/**
 * Supabase service layer — Suppliers & supplier products.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

import type {
    Supplier,
    SupplierInsert,
    SupplierUpdate,
    SupplierProduct,
    SupplierProductInsert,
    ProductSupplierMatche,
    ProductSupplierMatcheInsert,
} from '@puckora/types'

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export async function getSupplierByAlibabaId(
    supabase: SupabaseInstance,
    alibabaId: string,
): Promise<Supplier | null> {
    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('alibaba_id', alibabaId)
        .maybeSingle()

    if (error) throw new Error(`getSupplierByAlibabaId failed: ${error.message}`)
    return data as Supplier | null
}

export async function upsertSupplier(
    supabase: SupabaseInstance,
    supplier: SupplierInsert,
): Promise<Supplier> {
    const { data, error } = await supabase
        .from('suppliers')
        .upsert(
            { ...supplier, updated_at: new Date().toISOString() },
            { onConflict: 'alibaba_id' },
        )
        .select('*')
        .single()

    if (error) throw new Error(`upsertSupplier failed: ${error.message}`)
    return data as Supplier
}

export async function upsertSuppliers(
    supabase: SupabaseInstance,
    suppliers: SupplierInsert[],
): Promise<Supplier[]> {
    if (suppliers.length === 0) return []
    const { data, error } = await supabase
        .from('suppliers')
        .upsert(
            suppliers.map((s) => ({ ...s, updated_at: new Date().toISOString() })),
            { onConflict: 'alibaba_id' },
        )
        .select('*')

    if (error) throw new Error(`upsertSuppliers failed: ${error.message}`)
    return data as Supplier[]
}

export async function updateSupplier(
    supabase: SupabaseInstance,
    id: string,
    update: SupplierUpdate,
): Promise<Supplier> {
    const { data, error } = await supabase
        .from('suppliers')
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()

    if (error) throw new Error(`updateSupplier failed: ${error.message}`)
    return data as Supplier
}

export async function getSavedSuppliersByUser(
    supabase: SupabaseInstance,
    userId: string,
): Promise<Array<Supplier & { notes: string | null; tags: string[] | null }>> {
    const { data, error } = await supabase
        .from('saved_suppliers')
        .select('notes, tags, suppliers(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) throw new Error(`getSavedSuppliersByUser failed: ${error.message}`)
    return (data ?? []).map((row: { notes: string | null; tags: string[] | null; suppliers: Supplier }) => ({
        ...row.suppliers,
        notes: row.notes,
        tags: row.tags,
    }))
}

export async function saveSupplier(
    supabase: SupabaseInstance,
    userId: string,
    supplierId: string,
    options: { linkedProductId?: string; notes?: string; tags?: string[] } = {},
): Promise<void> {
    const { error } = await supabase.from('saved_suppliers').upsert(
        {
            user_id: userId,
            supplier_id: supplierId,
            linked_product_id: options.linkedProductId ?? null,
            notes: options.notes ?? null,
            tags: options.tags ?? null,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,supplier_id' },
    )
    if (error) throw new Error(`saveSupplier failed: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Supplier products
// ---------------------------------------------------------------------------

export async function getSupplierProductsBySupplier(
    supabase: SupabaseInstance,
    supplierId: string,
): Promise<SupplierProduct[]> {
    const { data, error } = await supabase
        .from('supplier_products')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('scraped_at', { ascending: false })

    if (error) throw new Error(`getSupplierProductsBySupplier failed: ${error.message}`)
    return data as SupplierProduct[]
}

export async function upsertSupplierProduct(
    supabase: SupabaseInstance,
    product: SupplierProductInsert,
): Promise<SupplierProduct> {
    const { data, error } = await supabase
        .from('supplier_products')
        .upsert(
            { ...product, updated_at: new Date().toISOString() },
            { onConflict: 'alibaba_product_id' },
        )
        .select('*')
        .single()

    if (error) throw new Error(`upsertSupplierProduct failed: ${error.message}`)
    return data as SupplierProduct
}

export async function upsertSupplierProducts(
    supabase: SupabaseInstance,
    products: SupplierProductInsert[],
): Promise<SupplierProduct[]> {
    if (products.length === 0) return []
    const { data, error } = await supabase
        .from('supplier_products')
        .upsert(
            products.map((p) => ({ ...p, updated_at: new Date().toISOString() })),
            { onConflict: 'alibaba_product_id' },
        )
        .select('*')

    if (error) throw new Error(`upsertSupplierProducts failed: ${error.message}`)
    return data as SupplierProduct[]
}

// ---------------------------------------------------------------------------
// Product ↔ Supplier matches
// ---------------------------------------------------------------------------

export async function getMatchesForProduct(
    supabase: SupabaseInstance,
    productId: string,
    minScore = 0,
): Promise<ProductSupplierMatche[]> {
    const { data, error } = await supabase
        .from('product_supplier_matches')
        .select('*, supplier_products(*, suppliers(*))')
        .eq('product_id', productId)
        .gte('match_score', minScore)
        .order('match_score', { ascending: false })

    if (error) throw new Error(`getMatchesForProduct failed: ${error.message}`)
    return data as ProductSupplierMatche[]
}

export async function upsertProductSupplierMatche(
    supabase: SupabaseInstance,
    match: ProductSupplierMatcheInsert,
): Promise<ProductSupplierMatche> {
    const { data, error } = await supabase
        .from('product_supplier_matches')
        .upsert(
            { ...match, updated_at: new Date().toISOString() },
            { onConflict: 'product_id,supplier_product_id' },
        )
        .select('*')
        .single()

    if (error) throw new Error(`upsertProductSupplierMatche failed: ${error.message}`)
    return data as ProductSupplierMatche
}
