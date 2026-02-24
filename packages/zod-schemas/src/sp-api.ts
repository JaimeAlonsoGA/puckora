import { z } from 'zod'

const MarketplaceSchema = z.enum(['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'CA', 'JP'])

/** Single-ASIN SP-API lookup */
export const SpApiLookupSchema = z.object({
    asin: z
        .string()
        .regex(/^[A-Z0-9]{10}$/, 'ASIN must be 10 uppercase alphanumeric characters'),
    marketplace: MarketplaceSchema.default('US'),
    price: z.number().positive().optional(),
})
export type SpApiLookupInput = z.infer<typeof SpApiLookupSchema>

/** Bulk SP-API lookup (up to 20 ASINs) */
export const SpApiBulkLookupSchema = z.object({
    asins: z
        .string()
        .min(1, 'Enter at least one ASIN')
        .transform((v) =>
            v
                .split(/[\s,;]+/)
                .map((a) => a.trim().toUpperCase())
                .filter(Boolean),
        )
        .pipe(
            z
                .array(z.string().regex(/^[A-Z0-9]{10}$/, 'Each ASIN must be 10 characters'))
                .min(1)
                .max(20),
        ),
    marketplace: MarketplaceSchema.default('US'),
    price: z.number().positive().optional(),
})
export type SpApiBulkLookupInput = z.infer<typeof SpApiBulkLookupSchema>
