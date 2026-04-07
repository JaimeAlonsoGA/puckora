'use client'
/**
 * Query domain — single amazon product (by ASIN).
 *
 * The product page is typically SSR-prefetched; this query is used for
 * client-side cache seeding and future real-time updates.
 */
import { queryOptions } from '@tanstack/react-query'
import { amazonProductKeys } from './_keys'
import type { ProductFinancial } from '@puckora/types'
import { QUERY_ERROR_MESSAGES } from '@/constants/api'
import { fetchJson } from './fetch'

export const amazonProductQueryOptions = (asin: string, marketplace: string) =>
    queryOptions<ProductFinancial | null>({
        queryKey: amazonProductKeys.detail(asin, marketplace),
        queryFn: async () => {
            const params = new URLSearchParams({ asin, marketplace })
            return fetchJson<ProductFinancial | null>(
                `/api/search/product?${params}`,
                undefined,
                QUERY_ERROR_MESSAGES.PRODUCT_FETCH_FAILED,
            )
        },
        staleTime: 5 * 60_000,
    })
