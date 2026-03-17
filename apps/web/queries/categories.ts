'use client'

/**
 * TanStack Query definitions for categories.
 * Categories are used in the search shell and product details page.
 * They change rarely, so we cache them for 24h.
 */

import { queryOptions } from '@tanstack/react-query'
import { getTopLevelCategories } from '@/services/categories'
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
            return getTopLevelCategories(marketplace)
        },
        staleTime: 24 * 60 * 60 * 1000, // 24h
    })

