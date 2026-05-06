'use client'
/**
 * Query domain — similar products by ASIN (pgvector semantic similarity).
 *
 * Fetches from /api/search/product/similar which calls @puckora/vectors
 * server-side. Results are cached for 10 minutes — vector index rarely changes.
 */
import { queryOptions } from '@tanstack/react-query'
import { similarProductKeys } from './_keys'
import { QUERY_ERROR_MESSAGES } from '@/constants/api'
import { fetchJson } from './fetch'
import type { AmazonVectorSearchRow } from '@puckora/vectors'

export const similarProductsQueryOptions = (asin: string) =>
    queryOptions<AmazonVectorSearchRow[]>({
        queryKey: similarProductKeys.byAsin(asin),
        queryFn: async () => {
            const params = new URLSearchParams({ asin })
            return fetchJson<AmazonVectorSearchRow[]>(
                `/api/search/product/similar?${params}`,
                undefined,
                QUERY_ERROR_MESSAGES.SIMILAR_PRODUCTS_FETCH_FAILED,
            )
        },
        staleTime: 10 * 60_000,
        enabled: Boolean(asin),
        retry: 1,
    })
