import { z } from 'zod'

const MarketplaceSchema = z.enum(['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'CA', 'JP'])

export const CategoryTreeParamsSchema = z.object({
    marketplace: MarketplaceSchema.default('US'),
    depth: z.coerce.number().int().min(1).max(5).default(3),
    parentId: z.string().optional(),
})

export const CategorySemanticSearchSchema = z.object({
    query: z.string().min(1).max(200),
    marketplace: MarketplaceSchema.default('US'),
    matchThreshold: z.number().min(0).max(1).default(0.7),
    matchCount: z.number().int().min(1).max(20).default(10),
})

export type CategoryTreeParams = z.infer<typeof CategoryTreeParamsSchema>
export type CategorySemanticSearchData = z.infer<typeof CategorySemanticSearchSchema>
