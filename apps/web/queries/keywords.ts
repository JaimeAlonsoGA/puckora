'use client'
/**
 * Query domain — amazon_keywords.
 *
 * Search results are SSR-prefetched by the Server Component, so no queryFn
 * is needed for the initial load. This file exists to satisfy the query-domain
 * contract (keys + structure) and provides a client-side options factory for
 * any future polling or invalidation needs.
 */
import { queryOptions } from '@tanstack/react-query'
import { keywordKeys } from './_keys'
import type { ProductFinancial } from '@puckora/types'
import { QUERY_ERROR_MESSAGES } from '@/constants/api'
import { fetchJson } from './fetch'

export const keywordResultsQueryOptions = (keyword: string, marketplace: string) =>
    queryOptions<ProductFinancial[]>({
        queryKey: keywordKeys.results(keyword, marketplace),
        queryFn: async () => {
            const params = new URLSearchParams({ keyword, marketplace })
            return fetchJson<ProductFinancial[]>(
                `/api/search/keyword-results?${params}`,
                undefined,
                QUERY_ERROR_MESSAGES.KEYWORD_RESULTS_FETCH_FAILED,
            )
        },
        staleTime: 5 * 60_000,
    })
