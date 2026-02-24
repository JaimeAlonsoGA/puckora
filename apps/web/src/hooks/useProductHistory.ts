import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BSRDataPoint, PriceDataPoint } from '@repo/types'

export type HistoryWindow = '30d' | '90d' | '180d' | 'all'

function windowToCutoff(window: HistoryWindow): string | null {
    if (window === 'all') return null
    const days = parseInt(window)
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString()
}

export interface ProductHistoryData {
    bsrPoints: BSRDataPoint[]
    pricePoints: PriceDataPoint[]
}

/**
 * Fetch price + BSR history for a product from the product_history table.
 * product_history is partitioned — always include a snapshot_at range.
 */
export function useProductHistory(asin: string | null, window: HistoryWindow = '90d') {
    return useQuery<ProductHistoryData>({
        queryKey: ['product-history', asin, window],
        queryFn: async () => {
            const cutoff = windowToCutoff(window)

            let query = supabase
                .from('product_history')
                .select('snapshot_at, price, bsr')
                .eq('asin', asin!)
                .order('snapshot_at', { ascending: true })
                .limit(300)

            if (cutoff) {
                query = query.gte('snapshot_at', cutoff)
            }

            const { data, error } = await query
            if (error) throw error

            const rows = data ?? []
            return {
                bsrPoints: rows
                    .filter(r => r.bsr != null)
                    .map(r => ({ timestamp: r.snapshot_at, bsr: r.bsr as number })),
                pricePoints: rows
                    .filter(r => r.price != null)
                    .map(r => ({ timestamp: r.snapshot_at, price: r.price as number })),
            }
        },
        enabled: !!asin,
        staleTime: 1000 * 60 * 15,
    })
}
