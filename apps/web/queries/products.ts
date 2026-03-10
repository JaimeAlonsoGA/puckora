'use client'

import { queryOptions } from '@tanstack/react-query'
import type { AmazonProduct } from '@puckora/types'
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
            const res = await fetch(`/api/products/${asin}`)
            if (!res.ok) throw new Error(`Failed to fetch product: ${res.status}`)
            return res.json() as Promise<AmazonProduct>
        },
        enabled: !!asin,
        staleTime: 60_000,
    })
