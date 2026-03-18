/**
 * Zod schemas for the Amazon search module.
 */
import { z } from 'zod'
import {
    BUDGET_RANGE_VALUES,
    PRICE_RANGE_VALUES,
    SEARCH_MARK_STATE_VALUES,
    SEARCH_MODE_VALUES,
    WEIGHT_RANGE_VALUES,
} from '@/constants/search'
import { WEB_MARKETPLACE_IDS } from '@/constants/amazon-marketplace'

export const SearchQuerySchema = z.object({
    q: z.string().min(1).max(200),
    mode: z.enum(SEARCH_MODE_VALUES).optional(),
    categoryId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
})
export type SearchQuery = z.infer<typeof SearchQuerySchema>

export const ConstraintsSchema = z.object({
    budgetRange: z.enum(BUDGET_RANGE_VALUES).optional(),
    priceRange: z.enum(PRICE_RANGE_VALUES).optional(),
    weightKg: z.enum(WEIGHT_RANGE_VALUES).optional(),
    marketplace: z.enum(WEB_MARKETPLACE_IDS).optional(),
})
export type Constraints = z.infer<typeof ConstraintsSchema>

export const MarkProductSchema = z.object({
    asin: z.string().min(1),
    name: z.string().min(1),
    markState: z.enum(SEARCH_MARK_STATE_VALUES),
    note: z.string().max(500).optional(),
})
export type MarkProductInput = z.infer<typeof MarkProductSchema>
