'use client'

/**
 * TanStack Query definitions for categories.
 * Categories are used in the search shell and product details page.
 * They change rarely, so we cache them for 24h.
 */

import { queryOptions } from '@tanstack/react-query'
import type { AmazonCategory } from '@puckora/types'
import { categoryKeys } from './_keys'

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

/** All top-level categories for a marketplace. */
export const topCategoriesQueryOptions = (marketplace: string) =>
    queryOptions({
        queryKey: categoryKeys.topLevel(marketplace),
        queryFn: async (): Promise<AmazonCategory[]> => {
            const res = await fetch(`/api/categories?marketplace=${encodeURIComponent(marketplace)}`)
            if (!res.ok) throw new Error('Failed to fetch categories')
            return res.json() as Promise<AmazonCategory[]>
        },
        staleTime: 24 * 60 * 60 * 1000, // 24h
    })

