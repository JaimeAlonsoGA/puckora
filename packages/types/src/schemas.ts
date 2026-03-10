import { z } from 'zod'
import { MARKETPLACES, SUPPORTED_LOCALES } from './meta.types'
import type { AmazonMarketplace, AppLanguage } from './meta.types'

// Derive enum tuples from canonical constants — single source of truth
const [firstMarket, ...restMarkets] = MARKETPLACES.map((m) => m.id) as [
    AmazonMarketplace,
    ...AmazonMarketplace[]
]
const [firstLocale, ...restLocales] = [...SUPPORTED_LOCALES] as [AppLanguage, ...AppLanguage[]]

export const SettingsUpdateSchema = z.object({
    display_name: z.string().min(1).max(100).optional(),
    avatar_url: z.string().url().optional().nullable(),
    marketplace: z.enum([firstMarket, ...restMarkets]).optional(),
    language: z.enum([firstLocale, ...restLocales]).optional(),
})

export type SettingsUpdateInput = z.infer<typeof SettingsUpdateSchema>
