import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type { TrackedProduct, TrackedProductInsert, TrackedProductUpdate } from '@repo/types'

// List all tracked products for the current user
export function useTrackerProducts() {
    const { user } = useAuth()
    return useQuery<TrackedProduct[]>({
        queryKey: ['tracker-products'],
        queryFn: () => api.get('/tracker-products'),
        staleTime: 1000 * 60 * 2,
        enabled: !!user,   // don't fire until session is confirmed
    })
}

// Save a new product to the tracker
// Accepts either { product_id, ...rest } or { asin, marketplace, ...rest }
// The edge function resolves asin → product_id automatically
export type SaveProductInput =
    | Omit<TrackedProductInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>
    | { asin: string; marketplace?: string;[key: string]: unknown }

export function useSaveProduct() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: SaveProductInput) =>
            api.post<TrackedProduct>('/tracker-products', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tracker-products'] })
        },
    })
}

// Update a tracked product (notes, tags, stage, alert thresholds)
export function useUpdateTrackedProduct() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...updates }: Pick<TrackedProductUpdate, 'id'> & Partial<TrackedProductUpdate>) =>
            api.patch<TrackedProduct>('/tracker-products', { id, ...updates }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tracker-products'] })
        },
    })
}

// Remove a product from the tracker
export function useDeleteTrackedProduct() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => api.delete<{ deleted: boolean }>(`/tracker-products?id=${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tracker-products'] })
        },
    })
}
