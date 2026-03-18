import { z } from 'zod'
import { ProductScrapeStatusEnum } from './catalog.types'
import { MARKETPLACES, SUPPORTED_LOCALES } from './meta.types'
import type { AmazonProductInsert, ProductScrapeStatus } from './catalog.types'
import type { AmazonMarketplace, AppLanguage } from './meta.types'

// Derive enum tuples from canonical constants — single source of truth
const [firstMarket, ...restMarkets] = MARKETPLACES.map((m) => m.id) as [
    AmazonMarketplace,
    ...AmazonMarketplace[]
]
const [firstLocale, ...restLocales] = [...SUPPORTED_LOCALES] as [AppLanguage, ...AppLanguage[]]
const [firstProductScrapeStatus, ...restProductScrapeStatuses] = Object.values(ProductScrapeStatusEnum) as [
    ProductScrapeStatus,
    ...ProductScrapeStatus[]
]

export const SettingsUpdateSchema = z.object({
    display_name: z.string().min(1).max(100).optional(),
    avatar_url: z.string().url().optional().nullable(),
    marketplace: z.enum([firstMarket, ...restMarkets]).optional(),
    language: z.enum([firstLocale, ...restLocales]).optional(),
})

export const AmazonProductInsertSchema: z.ZodType<AmazonProductInsert> = z.object({
    asin: z.string(),
    title: z.string().nullable().optional(),
    brand: z.string().nullable().optional(),
    manufacturer: z.string().nullable().optional(),
    model_number: z.string().nullable().optional(),
    package_quantity: z.number().nullable().optional(),
    color: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    rating: z.number().nullable().optional(),
    review_count: z.number().int().nullable().optional(),
    main_image_url: z.string().nullable().optional(),
    product_url: z.string().nullable().optional(),
    bullet_points: z.array(z.string()).nullable().optional(),
    product_type: z.string().nullable().optional(),
    browse_node_id: z.string().nullable().optional(),
    item_length_cm: z.number().nullable().optional(),
    item_width_cm: z.number().nullable().optional(),
    item_height_cm: z.number().nullable().optional(),
    item_weight_kg: z.number().nullable().optional(),
    pkg_length_cm: z.number().nullable().optional(),
    pkg_width_cm: z.number().nullable().optional(),
    pkg_height_cm: z.number().nullable().optional(),
    pkg_weight_kg: z.number().nullable().optional(),
    listing_date: z.string().nullable().optional(),
    fba_fee: z.number().nullable().optional(),
    referral_fee: z.number().nullable().optional(),
    scrape_status: z.enum([firstProductScrapeStatus, ...restProductScrapeStatuses]).optional(),
    enriched_at: z.string().nullable().optional(),
    updated_at: z.string().optional(),
    created_at: z.string().optional(),
    embedding: z.string().nullable().optional(),
})

export type SettingsUpdateInput = z.infer<typeof SettingsUpdateSchema>
export type AmazonProductInsertInput = z.infer<typeof AmazonProductInsertSchema>
