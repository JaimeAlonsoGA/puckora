'use client'

/**
 * TanStack Query definitions for categories.
 * Categories are used in the search shell and product details page.
 * They change rarely, so we cache them for 24h.
 */

import { queryOptions } from '@tanstack/react-query'
import type { AmazonCategory } from '@puckora/types'
import { QUERY_ERROR_MESSAGES } from '@/constants/api'
import { fetchJson } from './fetch'
import { categoryKeys } from './_keys'

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

/** All top-level categories for a marketplace. */
export const topCategoriesQueryOptions = (marketplace: string) =>
    queryOptions({
        queryKey: categoryKeys.topLevel(marketplace),
        queryFn: async (): Promise<AmazonCategory[]> => {
            return fetchJson<AmazonCategory[]>(
                `/api/categories?marketplace=${encodeURIComponent(marketplace)}`,
                undefined,
                QUERY_ERROR_MESSAGES.CATEGORIES_FETCH_FAILED,
            )
        },
        staleTime: 24 * 60 * 60 * 1000, // 24h
    })

