import { z } from 'zod'

export const AlibabaSearchParamsSchema = z.object({
    q: z.string().min(1).max(200),
    page: z.coerce.number().int().min(1).max(50).default(1),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    isVerified: z.coerce.boolean().optional(),
    isTradeAssurance: z.coerce.boolean().optional(),
})

export type AlibabaSearchParams = z.infer<typeof AlibabaSearchParamsSchema>
