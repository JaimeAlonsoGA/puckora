import { z } from 'zod'

/**
 * URL search-param filter schema for /search/discover.
 * All fields are optional — the page works with no filters applied.
 * `z.coerce.number()` handles the string → number conversion from URL params.
 * `categories` is a comma-separated list of top-level category IDs;
 * empty string (undefined) means all categories are included.
 */
export const DiscoverFiltersSchema = z.object({
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    maxRating: z.coerce.number().min(0).max(5).optional(),
    minReviews: z.coerce.number().int().nonnegative().optional(),
    maxReviews: z.coerce.number().int().nonnegative().optional(),
    categories: z
        .string()
        .optional()
        .transform((v) => (v ? v.split(',').filter(Boolean) : [])),
    limit: z.coerce.number().int().min(1).max(100).default(100),
})

export type DiscoverFilters = z.infer<typeof DiscoverFiltersSchema>
