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

// ---------------------------------------------------------------------------
// Tab const-as-enum (single source of truth)
// ---------------------------------------------------------------------------

export const TAB_IDS = {
    KEYWORD: 'keyword',
    CATEGORY: 'category',
    CONSTRAINTS: 'constraints',
} as const

export const TAB_ID_VALUES = [
    TAB_IDS.KEYWORD,
    TAB_IDS.CATEGORY,
    TAB_IDS.CONSTRAINTS,
] as const

export type Tab = (typeof TAB_ID_VALUES)[number]

export const SEARCH_MODE_VALUES = ['keyword', 'category', 'constraints'] as const

// ---------------------------------------------------------------------------
// Keyword suggestions (EN examples — not localised, Amazon US product terms)
// ---------------------------------------------------------------------------

export const KEYWORD_SUGGESTIONS = [
    'lap desk',
    'silicone mold',
    'pet water fountain',
    'resistance bands',
    'bamboo organizer',
    'posture corrector',
] as const

// ---------------------------------------------------------------------------
// Input mode const-as-enum
// ---------------------------------------------------------------------------

export const SEARCH_INPUT_MODE_IDS = {
    TEXT: 'text',
    CONSTRAINTS: 'constraints',
} as const

export const SEARCH_INPUT_MODE_VALUES = [
    SEARCH_INPUT_MODE_IDS.TEXT,
    SEARCH_INPUT_MODE_IDS.CONSTRAINTS,
] as const

export type SearchInputMode = (typeof SEARCH_INPUT_MODE_VALUES)[number]

export const SEARCH_INPUT_MODES: {
    id: SearchInputMode
    labelKey: 'inputMode.text' | 'inputMode.constraints'
    descKey: 'inputMode.textDesc' | 'inputMode.constraintsDesc'
}[] = [
        { id: 'text', labelKey: 'inputMode.text', descKey: 'inputMode.textDesc' },
        { id: 'constraints', labelKey: 'inputMode.constraints', descKey: 'inputMode.constraintsDesc' },
    ]

// ---------------------------------------------------------------------------
// Constraint fields (Mode 2 — editable inline constraint badges)
// ---------------------------------------------------------------------------

export const CONSTRAINT_FIELD_IDS = {
    PRICE: 'price',
    WEIGHT: 'weight',
    REVIEWS: 'reviews',
    RATING: 'rating',
} as const

export const CONSTRAINT_FIELD_VALUES = [
    CONSTRAINT_FIELD_IDS.PRICE,
    CONSTRAINT_FIELD_IDS.WEIGHT,
    CONSTRAINT_FIELD_IDS.REVIEWS,
    CONSTRAINT_FIELD_IDS.RATING,
] as const

export type ConstraintFieldId = (typeof CONSTRAINT_FIELD_VALUES)[number]

export interface ConstraintFieldDef {
    id: ConstraintFieldId
    prefix?: string
    suffix?: string
    placeholderMin: string
    placeholderMax: string
    ariaLabelKey: 'constraints.price.label' | 'constraints.weight.label' | 'constraints.reviews.label' | 'constraints.rating.label'
}

export const CONSTRAINT_FIELDS: ConstraintFieldDef[] = [
    {
        id: CONSTRAINT_FIELD_IDS.PRICE,
        prefix: '$',
        placeholderMin: '10',
        placeholderMax: '50',
        ariaLabelKey: 'constraints.price.label',
    },
    {
        id: CONSTRAINT_FIELD_IDS.WEIGHT,
        suffix: 'kg',
        placeholderMin: '0.5',
        placeholderMax: '2',
        ariaLabelKey: 'constraints.weight.label',
    },
    {
        id: CONSTRAINT_FIELD_IDS.REVIEWS,
        suffix: 'rev',
        placeholderMin: '100',
        placeholderMax: '5000',
        ariaLabelKey: 'constraints.reviews.label',
    },
    {
        id: CONSTRAINT_FIELD_IDS.RATING,
        suffix: '★',
        placeholderMin: '3.5',
        placeholderMax: '4.5',
        ariaLabelKey: 'constraints.rating.label',
    },
]

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
    { id: 'home-kitchen', labelKey: 'categories.homeKitchen', count: '284k' },
    { id: 'sports-outdoors', labelKey: 'categories.sportsOutdoors', count: '196k' },
    { id: 'pet-supplies', labelKey: 'categories.pet', count: '112k' },
    { id: 'baby', labelKey: 'categories.baby', count: '89k' },
    { id: 'health-beauty', labelKey: 'categories.health', count: '231k' },
]

export const CATEGORY_KEYWORD_RECOMMENDATIONS = {
    'home-kitchen': [
        'under sink organizer',
        'silicone baking mat',
        'wooden utensil holder',
        'magnetic spice rack',
        'soap dispenser set',
        'dish drying mat',
        'pan lid organizer',
        'refrigerator storage bin',
        'linen table runner',
        'oil sprayer bottle',
    ],
    'sports-outdoors': [
        'pickleball paddle set',
        'running belt',
        'resistance loop bands',
        'yoga wheel',
        'hiking water filter',
        'camping utensil kit',
        'ankle weights',
        'gym chalk bag',
        'portable folding stool',
        'tennis overgrip tape',
    ],
    'pet-supplies': [
        'cat window perch',
        'dog slow feeder bowl',
        'lick mat for dogs',
        'pet grooming glove',
        'automatic cat toy',
        'dog treat pouch',
        'pet hair remover roller',
        'portable dog water bottle',
        'cat litter mat',
        'pet car seat cover',
    ],
    baby: [
        'silicone bib set',
        'stroller organizer bag',
        'baby bottle drying rack',
        'crib sheet set',
        'diaper caddy organizer',
        'teething mitten',
        'baby bath support',
        'high chair splash mat',
        'pacifier holder case',
        'portable changing pad',
    ],
    'health-beauty': [
        'scalp massager brush',
        'ice face roller',
        'makeup brush cleaner',
        'travel pill organizer',
        'silk sleep mask',
        'dermaplaning razors',
        'nail dust collector',
        'eyelash shampoo kit',
        'electric heating pad',
        'makeup sponge holder',
    ],
} as const satisfies Record<CategoryId, readonly string[]>

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

export const SEARCH_OVERVIEW_PARAM = {
    WEIGHT: 'weight',
    REVIEWS: 'reviews',
    AMAZON_CUT: 'amazonCut',
    PRICE: 'price',
} as const

export const SEARCH_OVERVIEW_PARAM_VALUES = [
    SEARCH_OVERVIEW_PARAM.WEIGHT,
    SEARCH_OVERVIEW_PARAM.REVIEWS,
    SEARCH_OVERVIEW_PARAM.AMAZON_CUT,
    SEARCH_OVERVIEW_PARAM.PRICE,
] as const

export type SearchOverviewParamId = (typeof SEARCH_OVERVIEW_PARAM_VALUES)[number]

export interface SearchOverviewQuickCheckThresholds {
    maxAvgWeightKg: number
    reviewWallCount: number
    maxAmazonCutPct: number
    maxPriceUsd: number
}

export const SEARCH_OVERVIEW_QUICK_CHECK_DEFAULTS: SearchOverviewQuickCheckThresholds = {
    maxAvgWeightKg: 1,
    reviewWallCount: 250,
    maxAmazonCutPct: 30,
    maxPriceUsd: 35,
}

export const SEARCH_OVERVIEW_DEFAULT_PARAM_IDS = [
    SEARCH_OVERVIEW_PARAM.WEIGHT,
    SEARCH_OVERVIEW_PARAM.REVIEWS,
    SEARCH_OVERVIEW_PARAM.AMAZON_CUT,
] as const satisfies readonly SearchOverviewParamId[]

export const SEARCH_OVERVIEW_QUICK_CHECK_BANDS = {
    WEIGHT_WARN_MULTIPLIER: 1.35,
    REVIEW_PASS_RATIO: 0.6,
    AMAZON_CUT_PASS_RATIO: 0.8,
    PRICE_WARN_MULTIPLIER: 1.15,
} as const

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
        labelKey: 'constraints.budget.label',
        options: [
            { value: BUDGET_RANGE_VALUES[0], labelKey: 'constraints.budget.lt3k' },
            { value: BUDGET_RANGE_VALUES[1], labelKey: 'constraints.budget.3to10k' },
            { value: BUDGET_RANGE_VALUES[2], labelKey: 'constraints.budget.gt10k' },
        ],
    },
    {
        key: 'priceRange',
        labelKey: 'constraints.price.label',
        options: [
            { value: PRICE_RANGE_VALUES[0], labelKey: 'constraints.price.10to25' },
            { value: PRICE_RANGE_VALUES[1], labelKey: 'constraints.price.25to50' },
            { value: PRICE_RANGE_VALUES[2], labelKey: 'constraints.price.gt50' },
        ],
    },
    {
        key: 'weightKg',
        labelKey: 'constraints.weight.label',
        options: [
            { value: WEIGHT_RANGE_VALUES[0], labelKey: 'constraints.weight.lt1' },
            { value: WEIGHT_RANGE_VALUES[1], labelKey: 'constraints.weight.1to3' },
            { value: WEIGHT_RANGE_VALUES[2], labelKey: 'constraints.weight.any' },
        ],
    },
    {
        key: 'marketplace',
        labelKey: 'constraints.marketplace.label',
        options: [
            { value: WEB_MARKETPLACE_IDS[0], labelKey: 'constraints.marketplace.US' },
            { value: WEB_MARKETPLACE_IDS[1], labelKey: 'constraints.marketplace.UK' },
            { value: WEB_MARKETPLACE_IDS[2], labelKey: 'constraints.marketplace.DE' },
            { value: WEB_MARKETPLACE_IDS[3], labelKey: 'constraints.marketplace.ES' },
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
