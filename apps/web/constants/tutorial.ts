// Tutorial panel key registry.
// Content is now in i18n/messages/{locale}/tutorial.json — use useTranslations('tutorial') in components.
// No imports from server/, services/, queries/, or React.

export const TUTORIAL_KEYS = {
    PRICE_STAT: 'price_stat',
    REVENUE_STAT: 'revenue_stat',
    RATING_STAT: 'rating_stat',
    SOCIAL_STAT: 'social_stat',
    FBA_FEES_STAT: 'fba_fees_stat',
    CERTIFICATIONS: 'certifications',
    MARKET_SHARE: 'market_share',
    PRODUCT_IMAGES: 'product_images',
    RELATED_KEYWORDS: 'related_keywords',
    TOP_CATEGORIES: 'top_categories',
    PRICE_DIST: 'price_dist',
} as const

export const TUTORIAL_KEY_VALUES = Object.values(TUTORIAL_KEYS) as TutorialKey[]

export type TutorialKey = (typeof TUTORIAL_KEYS)[keyof typeof TUTORIAL_KEYS]

