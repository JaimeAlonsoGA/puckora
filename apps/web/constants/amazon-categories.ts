/**
 * Main Amazon browse-node categories used across the app (search constraints,
 * category explorer, etc.).  The `iconName` maps to a Lucide icon component —
 * import with `import { iconName } from 'lucide-react'`.
 */

export const AMAZON_CATEGORY_IDS = {
    HOME_KITCHEN: 'home-kitchen',
    SPORTS_OUTDOORS: 'sports-outdoors',
    PET_SUPPLIES: 'pet-supplies',
    BABY: 'baby',
    HEALTH_BEAUTY: 'health-beauty',
    ELECTRONICS: 'electronics',
    CLOTHING: 'clothing',
    TOYS_GAMES: 'toys-games',
    OFFICE_PRODUCTS: 'office-products',
    AUTOMOTIVE: 'automotive',
} as const

export const AMAZON_CATEGORY_VALUES = [
    AMAZON_CATEGORY_IDS.HOME_KITCHEN,
    AMAZON_CATEGORY_IDS.SPORTS_OUTDOORS,
    AMAZON_CATEGORY_IDS.PET_SUPPLIES,
    AMAZON_CATEGORY_IDS.BABY,
    AMAZON_CATEGORY_IDS.HEALTH_BEAUTY,
    AMAZON_CATEGORY_IDS.ELECTRONICS,
    AMAZON_CATEGORY_IDS.CLOTHING,
    AMAZON_CATEGORY_IDS.TOYS_GAMES,
    AMAZON_CATEGORY_IDS.OFFICE_PRODUCTS,
    AMAZON_CATEGORY_IDS.AUTOMOTIVE,
] as const

export type AmazonCategoryId = (typeof AMAZON_CATEGORY_VALUES)[number]

export interface AmazonCategoryDef {
    id: AmazonCategoryId
    /** Key in the `amazonCategories` i18n namespace */
    labelKey: string
    /** Lucide icon name — import as `import { iconName } from 'lucide-react'` */
    iconName: string
}

export const AMAZON_CATEGORIES: AmazonCategoryDef[] = [
    { id: AMAZON_CATEGORY_IDS.HOME_KITCHEN, labelKey: 'homeKitchen', iconName: 'UtensilsCrossed' },
    { id: AMAZON_CATEGORY_IDS.SPORTS_OUTDOORS, labelKey: 'sportsOutdoors', iconName: 'Dumbbell' },
    { id: AMAZON_CATEGORY_IDS.PET_SUPPLIES, labelKey: 'petSupplies', iconName: 'PawPrint' },
    { id: AMAZON_CATEGORY_IDS.BABY, labelKey: 'baby', iconName: 'Baby' },
    { id: AMAZON_CATEGORY_IDS.HEALTH_BEAUTY, labelKey: 'healthBeauty', iconName: 'HeartPulse' },
    { id: AMAZON_CATEGORY_IDS.ELECTRONICS, labelKey: 'electronics', iconName: 'Cpu' },
    { id: AMAZON_CATEGORY_IDS.CLOTHING, labelKey: 'clothing', iconName: 'Shirt' },
    { id: AMAZON_CATEGORY_IDS.TOYS_GAMES, labelKey: 'toysGames', iconName: 'Gamepad2' },
    { id: AMAZON_CATEGORY_IDS.OFFICE_PRODUCTS, labelKey: 'officeProducts', iconName: 'Briefcase' },
    { id: AMAZON_CATEGORY_IDS.AUTOMOTIVE, labelKey: 'automotive', iconName: 'Car' },
]

import type { LucideIcon } from 'lucide-react'
import {
    Baby,
    Briefcase,
    Car,
    Cpu,
    Dumbbell,
    Gamepad2,
    HeartPulse,
    PawPrint,
    Shirt,
    UtensilsCrossed,
} from 'lucide-react'

/** Maps `AmazonCategoryDef.iconName` to the corresponding Lucide icon component. */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
    UtensilsCrossed,
    Dumbbell,
    PawPrint,
    Baby,
    HeartPulse,
    Cpu,
    Shirt,
    Gamepad2,
    Briefcase,
    Car,
}
