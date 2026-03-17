/**
 * Zod schemas for the Amazon search module.
 */
import { z } from 'zod'

export const SearchQuerySchema = z.object({
    q: z.string().min(1).max(200),
    mode: z.enum(['keyword', 'category', 'constraints']).optional(),
    categoryId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
})
export type SearchQuery = z.infer<typeof SearchQuerySchema>

export const ConstraintsSchema = z.object({
    budgetRange: z.enum(['lt3k', '3to10k', 'gt10k']).optional(),
    priceRange: z.enum(['10to25', '25to50', 'gt50']).optional(),
    weightKg: z.enum(['lt1', '1to3', 'any']).optional(),
    marketplace: z.enum(['US', 'UK', 'DE', 'ES']).optional(),
})
export type Constraints = z.infer<typeof ConstraintsSchema>

export const MarkProductSchema = z.object({
    asin: z.string().min(1),
    name: z.string().min(1),
    markState: z.enum(['interested', 'watching', 'pass']),
    note: z.string().max(500).optional(),
})
export type MarkProductInput = z.infer<typeof MarkProductSchema>
