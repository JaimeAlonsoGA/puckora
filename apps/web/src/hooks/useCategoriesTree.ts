import { useQuery } from '@tanstack/react-query'
import { scraper } from '@/lib/scraper'
import { supabase } from '@/lib/supabase'
import type { CategoryNode } from '@repo/types'

// Load root category nodes directly from Supabase (no edge function hop).
export function useCategoriesTree(marketplace = 'US') {
    return useQuery<CategoryNode[]>({
        queryKey: ['categories-tree', marketplace],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('amazon_categories')
                .select(
                    'id, name, parent_id, full_path, breadcrumb, depth, is_leaf,' +
                    ' slug, referral_fee_pct, competition_level, opportunity_score,' +
                    ' avg_bsr, avg_price, avg_rating, product_count_est',
                )
                .eq('marketplace', marketplace)
                .eq('depth', 0)
                .order('full_path')

            if (error) throw error
            return (data ?? []) as unknown as CategoryNode[]
        },
        staleTime: 1000 * 60 * 10,
    })
}

// Load children of a specific category node directly from Supabase.
export function useCategoryChildren(parentId: string | null, marketplace = 'US') {
    return useQuery<CategoryNode[]>({
        queryKey: ['categories-children', parentId, marketplace],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('amazon_categories')
                .select(
                    'id, name, parent_id, full_path, breadcrumb, depth, is_leaf,' +
                    ' slug, referral_fee_pct, competition_level, opportunity_score',
                )
                .eq('marketplace', marketplace)
                .eq('parent_id', parentId!)
                .order('full_path')

            if (error) throw error
            return (data ?? []) as unknown as CategoryNode[]
        },
        enabled: !!parentId,
        staleTime: 1000 * 60 * 10,
    })
}

// Semantic category search via OpenAI embeddings — calls the Python scraper.
export function useCategoriesSearch(query: string, marketplace = 'US') {
    return useQuery<CategoryNode[]>({
        queryKey: ['categories-search', query, marketplace],
        queryFn: () =>
            scraper.post<CategoryNode[]>('/categories/search', {
                query,
                marketplace,
                limit: 20,
            }),
        enabled: query.trim().length > 1,
        staleTime: 1000 * 60 * 5,
    })
}
