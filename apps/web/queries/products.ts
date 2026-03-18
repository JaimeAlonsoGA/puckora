'use client'

import { queryOptions } from '@tanstack/react-query'
import type { AmazonProduct } from '@puckora/types'
import { QUERY_ERROR_MESSAGES } from '@/constants/api'
import { fetchJson } from './fetch'
import { productKeys } from './_keys'

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

/** Full amazon_products row by ASIN. */
export const productQueryOptions = (asin: string | null) =>
    queryOptions({
        queryKey: productKeys.detail(asin ?? ''),
        queryFn: async (): Promise<AmazonProduct | null> => {
            if (!asin) return null
            return fetchJson<AmazonProduct>(
                `/api/products/${asin}`,
                undefined,
                QUERY_ERROR_MESSAGES.PRODUCT_FETCH_FAILED,
            )
        },
        enabled: !!asin,
        staleTime: 60_000,
    })
