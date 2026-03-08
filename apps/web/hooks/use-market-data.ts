'use client'

/**
 * TanStack Query hooks for market data: trending products, market opportunities.
 */

import { useQuery } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const marketKeys = {
    all: ['market'] as const,
    trending: (marketplace: string, category?: string) =>
        [...marketKeys.all, 'trending', marketplace, category ?? 'all'] as const,
    opportunities: (marketplace: string) =>
        [...marketKeys.all, 'opportunities', marketplace] as const,
    fbaFees: (asin: string, marketplace: string) =>
        [...marketKeys.all, 'fba-fees', asin, marketplace] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrendingProductEntry {
    id: string
    asin: string
    title: string | null
    marketplace: string
    price: number | null
    bsr: number | null
    category: string | null
    image_url: string | null
    monthly_sales_est: number | null
    opportunity_score: number | null
    competition_score: number | null
    created_at: string
}

interface MarketOpportunityEntry {
    id: string
    marketplace: string
    keyword: string
    monthly_searches: number | null
    competition_level: string | null
    opportunity_score: number | null
    created_at: string
}

interface FbaFeesEntry {
    id: string
    asin: string
    marketplace: string
    fulfillment_fee: number | null
    referral_fee: number | null
    storage_fee_monthly: number | null
    total_fees: number | null
    net_margin: number | null
    fetched_at: string
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Top trending products for a marketplace.
 */
export function useTrendingProducts(marketplace: string, category?: string, limit = 20) {
    return useQuery({
        queryKey: marketKeys.trending(marketplace, category),
        queryFn: async (): Promise<TrendingProductEntry[]> => {
            const params = new URLSearchParams({
                marketplace,
                limit: String(limit),
            })
            if (category) params.set('category', category)
            const res = await fetch(`/api/market/trending?${params.toString()}`)
            if (!res.ok) throw new Error(`Failed to fetch trending products: ${res.status}`)
            return res.json() as Promise<TrendingProductEntry[]>
        },
        staleTime: 5 * 60_000, // 5 minutes — trends don't change that fast
    })
}

/**
 * Market opportunities for a given marketplace.
 */
export function useMarketOpportunities(marketplace: string, limit = 20) {
    return useQuery({
        queryKey: marketKeys.opportunities(marketplace),
        queryFn: async (): Promise<MarketOpportunityEntry[]> => {
            const params = new URLSearchParams({ marketplace, limit: String(limit) })
            const res = await fetch(`/api/market/opportunities?${params.toString()}`)
            if (!res.ok) throw new Error(`Failed to fetch market opportunities: ${res.status}`)
            return res.json() as Promise<MarketOpportunityEntry[]>
        },
        staleTime: 10 * 60_000, // 10 minutes
    })
}

/**
 * FBA fees for a specific product.
 */
export function useFbaFees(asin: string | null, marketplace: string) {
    return useQuery({
        queryKey: marketKeys.fbaFees(asin ?? '', marketplace),
        queryFn: async (): Promise<FbaFeesEntry | null> => {
            const params = new URLSearchParams({ asin: asin!, marketplace })
            const res = await fetch(`/api/market/fba-fees?${params.toString()}`)
            if (res.status === 404) return null
            if (!res.ok) throw new Error(`Failed to fetch FBA fees: ${res.status}`)
            return res.json() as Promise<FbaFeesEntry>
        },
        enabled: !!asin,
        staleTime: 60 * 60_000, // 1 hour — fees rarely change intraday
    })
}
