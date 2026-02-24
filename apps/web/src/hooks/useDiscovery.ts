import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { scraper } from '@/lib/scraper'
import type { TrendingProduct } from '@repo/types'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AiSuggestion {
    name: string
    rationale: string
    confidence: number
}

export interface DiscoverySuggestionsRequest {
    experience_level?: string
    budget_range?: string
    count?: number
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/** Reads trending products from the `trending_products` table, ordered by opportunity score. */
export function useTrendingProducts(marketplace = 'US') {
    return useQuery<TrendingProduct[]>({
        queryKey: ['trending-products', marketplace],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trending_products')
                .select('*')
                .eq('marketplace', marketplace)
                .order('opportunity_score', { ascending: false, nullsFirst: false })
                .limit(30)
            if (error) throw error
            return (data ?? []) as TrendingProduct[]
        },
        staleTime: 1000 * 60 * 10, // 10 min — feed doesn't need to be real-time
    })
}

/** Calls the Python AI endpoint to get product ideas personalised to the user's profile. */
export function useDiscoverySuggestions() {
    return useMutation({
        mutationFn: (req: DiscoverySuggestionsRequest) =>
            scraper.post<AiSuggestion[]>('/ai/suggest-products', {
                experience_level: req.experience_level ?? 'beginner',
                budget_range: req.budget_range ?? '1k_3k',
                count: req.count ?? 5,
            }),
    })
}
