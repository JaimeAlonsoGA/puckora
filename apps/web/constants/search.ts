/**
 * Search module — static constants.
 *
 * Keyword suggestions, category definitions, and constraint group
 * metadata all belong here. Translation keys reference strings in
 * `messages/{locale}/search.json`.
 *
 * No React, no imports from server/, services/, or queries/.
 */

import { Tab } from "@/types/search";

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
export type Marketplace = 'US' | 'UK' | 'DE' | 'ES'

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
            { value: 'lt3k', labelKey: 'budgetLt3k' },
            { value: '3to10k', labelKey: 'budget3to10k' },
            { value: 'gt10k', labelKey: 'budgetGt10k' },
        ],
    },
    {
        key: 'priceRange',
        labelKey: 'constraintsPrice',
        options: [
            { value: '10to25', labelKey: 'price10to25' },
            { value: '25to50', labelKey: 'price25to50' },
            { value: 'gt50', labelKey: 'priceGt50' },
        ],
    },
    {
        key: 'weightKg',
        labelKey: 'constraintsWeight',
        options: [
            { value: 'lt1', labelKey: 'weightLt1' },
            { value: '1to3', labelKey: 'weight1to3' },
            { value: 'any', labelKey: 'weightAny' },
        ],
    },
    {
        key: 'marketplace',
        labelKey: 'constraintsMarketplace',
        options: [
            { value: 'US', labelKey: 'marketplaceUS' },
            { value: 'UK', labelKey: 'marketplaceUK' },
            { value: 'DE', labelKey: 'marketplaceDE' },
            { value: 'ES', labelKey: 'marketplaceES' },
        ],
    },
]

/** Default constraint selections shown on first load. */
export const DEFAULT_CONSTRAINTS: Constraints = {
    budgetRange: '3to10k',
    priceRange: '25to50',
    weightKg: 'lt1',
    marketplace: 'US',
}
