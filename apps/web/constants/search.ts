/**
 * Search module — static constants.
 *
 * Keyword suggestions, category definitions, and constraint group
 * metadata all belong here. Translation keys reference strings in
 * `messages/{locale}/search.json`.
 *
 * No React, no imports from server/, services/, or queries/.
 */

import { WEB_MARKETPLACE_IDS } from '@/constants/amazon-marketplace'
import { MARK_STATE_VALUES } from '@/constants/app-state'
import { Tab } from '@/types/search'

export const SEARCH_MODE_VALUES = ['keyword', 'category', 'constraints'] as const

// ---------------------------------------------------------------------------
// Keyword suggestions (EN examples — not localised, Amazon US product terms)
// ---------------------------------------------------------------------------

export const TABS: { id: Tab; labelKey: 'tabKeyword' | 'tabCategory' | 'tabConstraints' }[] = [
    { id: 'keyword', labelKey: 'tabKeyword' },
    { id: 'category', labelKey: 'tabCategory' },
    { id: 'constraints', labelKey: 'tabConstraints' },
]

export const KEYWORD_SUGGESTIONS = [
    'lap desk',
    'silicone mold',
    'pet water fountain',
    'resistance bands',
    'bamboo organizer',
    'posture corrector',
] as const

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type CategoryId =
    | 'home-kitchen'
    | 'sports-outdoors'
    | 'pet-supplies'
    | 'baby'
    | 'health-beauty'

export interface CategoryMeta {
    id: CategoryId
    /** Key in the `search` i18n namespace, e.g. `t('categoryHomeKitchen')`. */
    labelKey: string
    /** Approximate product count stub — replace with API data when available. */
    count: string
}

export const CATEGORIES: CategoryMeta[] = [
    { id: 'home-kitchen', labelKey: 'categoryHomeKitchen', count: '284k' },
    { id: 'sports-outdoors', labelKey: 'categorySportsOutdoors', count: '196k' },
    { id: 'pet-supplies', labelKey: 'categoryPetSupplies', count: '112k' },
    { id: 'baby', labelKey: 'categoryBaby', count: '89k' },
    { id: 'health-beauty', labelKey: 'categoryHealthBeauty', count: '231k' },
]

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

export type BudgetRange = 'lt3k' | '3to10k' | 'gt10k'
export type PriceRange = '10to25' | '25to50' | 'gt50'
export type WeightKg = 'lt1' | '1to3' | 'any'
export type Marketplace = (typeof WEB_MARKETPLACE_IDS)[number]

export const BUDGET_RANGE_VALUES = ['lt3k', '3to10k', 'gt10k'] as const satisfies readonly BudgetRange[]
export const PRICE_RANGE_VALUES = ['10to25', '25to50', 'gt50'] as const satisfies readonly PriceRange[]
export const WEIGHT_RANGE_VALUES = ['lt1', '1to3', 'any'] as const satisfies readonly WeightKg[]

export const SEARCH_MARK_STATE_VALUES = MARK_STATE_VALUES

export type ConstraintKey = 'budgetRange' | 'priceRange' | 'weightKg' | 'marketplace'
export type Constraints = Partial<Record<ConstraintKey, string>>

export interface ConstraintOption {
    value: string
    /** Key in the `search` i18n namespace. */
    labelKey: string
}

export interface ConstraintGroup {
    key: ConstraintKey
    /** Key in the `search` i18n namespace. */
    labelKey: string
    options: ConstraintOption[]
}

export const CONSTRAINT_GROUPS: ConstraintGroup[] = [
    {
        key: 'budgetRange',
        labelKey: 'constraintsBudget',
        options: [
            { value: BUDGET_RANGE_VALUES[0], labelKey: 'budgetLt3k' },
            { value: BUDGET_RANGE_VALUES[1], labelKey: 'budget3to10k' },
            { value: BUDGET_RANGE_VALUES[2], labelKey: 'budgetGt10k' },
        ],
    },
    {
        key: 'priceRange',
        labelKey: 'constraintsPrice',
        options: [
            { value: PRICE_RANGE_VALUES[0], labelKey: 'price10to25' },
            { value: PRICE_RANGE_VALUES[1], labelKey: 'price25to50' },
            { value: PRICE_RANGE_VALUES[2], labelKey: 'priceGt50' },
        ],
    },
    {
        key: 'weightKg',
        labelKey: 'constraintsWeight',
        options: [
            { value: WEIGHT_RANGE_VALUES[0], labelKey: 'weightLt1' },
            { value: WEIGHT_RANGE_VALUES[1], labelKey: 'weight1to3' },
            { value: WEIGHT_RANGE_VALUES[2], labelKey: 'weightAny' },
        ],
    },
    {
        key: 'marketplace',
        labelKey: 'constraintsMarketplace',
        options: [
            { value: WEB_MARKETPLACE_IDS[0], labelKey: 'marketplaceUS' },
            { value: WEB_MARKETPLACE_IDS[1], labelKey: 'marketplaceUK' },
            { value: WEB_MARKETPLACE_IDS[2], labelKey: 'marketplaceDE' },
            { value: WEB_MARKETPLACE_IDS[3], labelKey: 'marketplaceES' },
        ],
    },
]

/** Default constraint selections shown on first load. */
export const DEFAULT_CONSTRAINTS: Constraints = {
    budgetRange: BUDGET_RANGE_VALUES[1],
    priceRange: PRICE_RANGE_VALUES[1],
    weightKg: WEIGHT_RANGE_VALUES[0],
    marketplace: WEB_MARKETPLACE_IDS[0],
}
