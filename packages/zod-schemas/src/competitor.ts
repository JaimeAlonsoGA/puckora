import { z } from 'zod'

const MarketplaceSchema = z.enum(['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'CA', 'JP'])

export const AnalysisRequestSchema = z.object({
    asin: z.string().regex(/^[A-Z0-9]{10}$/, 'Invalid ASIN format'),
    marketplace: MarketplaceSchema.default('US'),
    maxReviews: z.number().int().min(10).max(1000).default(200),
    minRating: z.number().int().min(1).max(5).default(1),
    maxRating: z.number().int().min(1).max(5).default(3),
})

export const CompetitorResultParamsSchema = z.object({
    id: z.string().uuid(),
})

export type AnalysisRequestData = z.infer<typeof AnalysisRequestSchema>
export type CompetitorResultParams = z.infer<typeof CompetitorResultParamsSchema>
