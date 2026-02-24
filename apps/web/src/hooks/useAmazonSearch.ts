import { useQuery } from '@tanstack/react-query'
import { scraper } from '@/lib/scraper'
import type { AmazonSearchResponse } from '@repo/types'
import type { AmazonSearchParams } from '@repo/zod-schemas'

export function useAmazonSearch(params: Partial<AmazonSearchParams>, enabled = true) {
    return useQuery<AmazonSearchResponse>({
        queryKey: ['amazon-search', params],
        queryFn: () =>
            scraper.post<AmazonSearchResponse>('/scrape/amazon/search', {
                query: params.q,
                marketplace: params.marketplace ?? 'US',
                page: params.page ?? 1,
                min_price: params.minPrice ?? null,
                max_price: params.maxPrice ?? null,
            }),
        enabled: enabled && !!params.q,
        staleTime: 1000 * 60 * 3,
    })
}
