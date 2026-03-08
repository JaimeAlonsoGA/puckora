'use client'

/**
 * TanStack Query hooks for product data.
 *
 * These hooks call Route Handler endpoints so product data can be
 * refreshed client-side without a full page navigation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const productKeys = {
    all: ['products'] as const,
    tracked: (userId: string) => [...productKeys.all, 'tracked', userId] as const,
    detail: (asin: string, marketplace: string) =>
        [...productKeys.all, 'detail', asin, marketplace] as const,
    withDetails: (asin: string, marketplace: string) =>
        [...productKeys.all, 'with-details', asin, marketplace] as const,
}

// ---------------------------------------------------------------------------
// Types (minimal — full types live in @puckora/types)
// ---------------------------------------------------------------------------

interface TrackedProductEntry {
    id: string
    asin: string
    title: string | null
    marketplace: string
    tracked_at: string
    product: {
        id: string
        asin: string
        title: string | null
        price: number | null
        rating: number | null
        review_count: number | null
        main_image_url: string | null
    } | null
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * All products the current user is tracking.
 */
export function useTrackedProducts(userId: string | null) {
    return useQuery({
        queryKey: productKeys.tracked(userId ?? ''),
        queryFn: async (): Promise<TrackedProductEntry[]> => {
            const res = await fetch('/api/products/tracked')
            if (!res.ok) throw new Error(`Failed to fetch tracked products: ${res.status}`)
            return res.json() as Promise<TrackedProductEntry[]>
        },
        enabled: !!userId,
        staleTime: 60_000, // 1 minute
    })
}

/**
 * Track a product by ASIN + marketplace.
 */
export function useTrackProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            asin,
            marketplace,
        }: {
            asin: string
            marketplace: string
        }) => {
            const res = await fetch('/api/products/tracked', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asin, marketplace }),
            })
            if (!res.ok) throw new Error(`Failed to track product: ${res.status}`)
            return res.json()
        },
        onSuccess: () => {
            // Invalidate all tracked queries for any user
            queryClient.invalidateQueries({ queryKey: productKeys.all })
        },
    })
}

/**
 * Untrack a product by tracked_product id.
 */
export function useUntrackProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (trackedProductId: string) => {
            const res = await fetch(`/api/products/tracked/${trackedProductId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error(`Failed to untrack product: ${res.status}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: productKeys.all })
        },
    })
}
