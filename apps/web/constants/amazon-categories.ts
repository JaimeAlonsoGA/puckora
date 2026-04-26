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
    /** Key in the `amazonCategories` i18n namespace (`t(\`amazonCategories.${labelKey}\`)`) */
    labelKey: string
    /** Lucide icon name — import as `import { iconName } from 'lucide-react'` */
    iconName: string
    /**
     * One or more canonical `amazon_categories.name` values (breadcrumb[1]) that
     * map to this static category ID.  Array because some user-facing categories
     * (e.g. Health & Beauty) span multiple Amazon root category names in the DB.
     */
    displayNames: string[]
}

export const AMAZON_CATEGORIES: AmazonCategoryDef[] = [
    { id: AMAZON_CATEGORY_IDS.HOME_KITCHEN, labelKey: 'homeKitchen', iconName: 'UtensilsCrossed', displayNames: ['Home & Kitchen'] },
    { id: AMAZON_CATEGORY_IDS.SPORTS_OUTDOORS, labelKey: 'sportsOutdoors', iconName: 'Dumbbell', displayNames: ['Sports & Outdoors'] },
    { id: AMAZON_CATEGORY_IDS.PET_SUPPLIES, labelKey: 'petSupplies', iconName: 'PawPrint', displayNames: ['Pet Supplies'] },
    // 'Baby Products' is the exact root name in amazon_categories.name (breadcrumb[1])
    { id: AMAZON_CATEGORY_IDS.BABY, labelKey: 'baby', iconName: 'Baby', displayNames: ['Baby Products'] },
    // Amazon splits health/beauty into two separate root categories
    { id: AMAZON_CATEGORY_IDS.HEALTH_BEAUTY, labelKey: 'healthBeauty', iconName: 'HeartPulse', displayNames: ['Beauty & Personal Care', 'Health & Household'] },
    { id: AMAZON_CATEGORY_IDS.ELECTRONICS, labelKey: 'electronics', iconName: 'Cpu', displayNames: ['Electronics'] },
    { id: AMAZON_CATEGORY_IDS.CLOTHING, labelKey: 'clothing', iconName: 'Shirt', displayNames: ['Clothing, Shoes & Jewelry'] },
    { id: AMAZON_CATEGORY_IDS.TOYS_GAMES, labelKey: 'toysGames', iconName: 'Gamepad2', displayNames: ['Toys & Games'] },
    { id: AMAZON_CATEGORY_IDS.OFFICE_PRODUCTS, labelKey: 'officeProducts', iconName: 'Briefcase', displayNames: ['Office Products'] },
    { id: AMAZON_CATEGORY_IDS.AUTOMOTIVE, labelKey: 'automotive', iconName: 'Car', displayNames: ['Automotive'] },
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
