import { z } from 'zod'

/**
 * URL search-param filter schema for /search/discover.
 * All fields are optional so the page works with no filters applied.
 * `z.coerce.number()` handles the string → number conversion from URL params.
 */
export const DiscoverFiltersSchema = z.object({
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    minRevenue: z.coerce.number().nonnegative().optional(),
    minReviews: z.coerce.number().int().nonnegative().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type DiscoverFilters = z.infer<typeof DiscoverFiltersSchema>
