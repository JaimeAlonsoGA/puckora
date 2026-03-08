'use client'

/**
 * TanStack Query hooks for supplier data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const supplierKeys = {
    all: ['suppliers'] as const,
    saved: (userId: string) => [...supplierKeys.all, 'saved', userId] as const,
    matches: (productId: string) => [...supplierKeys.all, 'matches', productId] as const,
    products: (supplierId: string) =>
        [...supplierKeys.all, 'products', supplierId] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SavedSupplierEntry {
    id: string
    supplier_id: string
    saved_at: string
    notes: string | null
    supplier: {
        id: string
        name: string
        country: string | null
        avg_rating: number | null
        is_verified: boolean | null
        is_gold_supplier: boolean | null
        url: string | null
    } | null
}

interface SupplierMatchEntry {
    id: string
    product_id: string
    supplier_product_id: string
    match_method: string
    match_score: number | null
    supplier_product: {
        id: string
        title: string | null
        price_min: number | null
        moq: number | null
        supplier: {
            id: string
            name: string
            country: string | null
        } | null
    } | null
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * All suppliers the current user has saved.
 */
export function useSavedSuppliers(userId: string | null) {
    return useQuery({
        queryKey: supplierKeys.saved(userId ?? ''),
        queryFn: async (): Promise<SavedSupplierEntry[]> => {
            const res = await fetch('/api/suppliers/saved')
            if (!res.ok) throw new Error(`Failed to fetch saved suppliers: ${res.status}`)
            return res.json() as Promise<SavedSupplierEntry[]>
        },
        enabled: !!userId,
        staleTime: 60_000,
    })
}

/**
 * Supplier–product matches for a given product ID.
 */
export function useProductSupplierMatches(productId: string | null) {
    return useQuery({
        queryKey: supplierKeys.matches(productId ?? ''),
        queryFn: async (): Promise<SupplierMatchEntry[]> => {
            const res = await fetch(`/api/suppliers/matches?productId=${productId}`)
            if (!res.ok) throw new Error(`Failed to fetch supplier matches: ${res.status}`)
            return res.json() as Promise<SupplierMatchEntry[]>
        },
        enabled: !!productId,
        staleTime: 2 * 60_000,
    })
}

/**
 * Save a supplier to the current user's saved list.
 */
export function useSaveSupplier() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            supplierId,
            notes,
        }: {
            supplierId: string
            notes?: string
        }) => {
            const res = await fetch('/api/suppliers/saved', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplierId, notes }),
            })
            if (!res.ok) throw new Error(`Failed to save supplier: ${res.status}`)
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: supplierKeys.all })
        },
    })
}

/**
 * Remove a supplier from the current user's saved list.
 */
export function useUnsaveSupplier() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (savedSupplierId: string) => {
            const res = await fetch(`/api/suppliers/saved/${savedSupplierId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error(`Failed to unsave supplier: ${res.status}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: supplierKeys.all })
        },
    })
}
