import { useQuery } from '@tanstack/react-query'
import { scraper } from '@/lib/scraper'
import type { AlibabaSearchResponse } from '@repo/types'

export interface SuppliersSearchParams {
    q: string
    page?: number
    minYears?: number
    maxMoq?: number
    verifiedOnly?: boolean
    tradeAssurance?: boolean
}

export function useSuppliersSearch(params: Partial<SuppliersSearchParams>, enabled = true) {
    return useQuery<AlibabaSearchResponse>({
        queryKey: ['suppliers-search', params],
        queryFn: () =>
            scraper.post<AlibabaSearchResponse>('/scrape/alibaba/search', {
                query: params.q,
                page: params.page ?? 1,
                min_years: params.minYears,
                max_moq: params.maxMoq,
                verified_only: params.verifiedOnly ?? false,
                trade_assurance: params.tradeAssurance ?? false,
            }),
        enabled: enabled && !!params.q,
        staleTime: 1000 * 60 * 5,
    })
}
