import { z } from 'zod'
import { WEB_MARKETPLACE_IDS, DEFAULT_WEB_MARKETPLACE } from '@/constants/amazon-marketplace'

export const MarketplaceSearchParamsSchema = z.object({
    marketplace: z.enum(WEB_MARKETPLACE_IDS).default(DEFAULT_WEB_MARKETPLACE),
})

export const KeywordResultsSearchParamsSchema = z.object({
    keyword: z.string().trim().min(1),
    marketplace: z.enum(WEB_MARKETPLACE_IDS).default(DEFAULT_WEB_MARKETPLACE),
})

export const ProductSearchParamsSchema = z.object({
    asin: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{10}$/),
    marketplace: z.enum(WEB_MARKETPLACE_IDS).default(DEFAULT_WEB_MARKETPLACE),
})

export type MarketplaceSearchParams = z.infer<typeof MarketplaceSearchParamsSchema>
export type KeywordResultsSearchParams = z.infer<typeof KeywordResultsSearchParamsSchema>
export type ProductSearchParams = z.infer<typeof ProductSearchParamsSchema>