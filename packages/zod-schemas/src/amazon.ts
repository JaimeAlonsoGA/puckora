import { z } from 'zod'

export const MarketplaceSchema = z.enum(['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'CA', 'JP'])

export const AmazonSearchParamsSchema = z.object({
    q: z.string().min(1).max(200),
    marketplace: MarketplaceSchema.default('US'),
    page: z.coerce.number().int().min(1).max(50).default(1),
    category: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    minBsr: z.coerce.number().int().min(1).optional(),
    maxBsr: z.coerce.number().int().min(1).optional(),
    minReviews: z.coerce.number().int().min(0).optional(),
    maxReviews: z.coerce.number().int().min(0).optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
})

export const ProductDetailParamsSchema = z.object({
    asin: z.string().regex(/^[A-Z0-9]{10}$/, 'Invalid ASIN format'),
    marketplace: MarketplaceSchema.default('US'),
})

export type AmazonSearchParams = z.infer<typeof AmazonSearchParamsSchema>
export type ProductDetailParams = z.infer<typeof ProductDetailParamsSchema>
