// Re-export from constants — Tab and the enum both live in constants/search.ts now.
// Keeping this file for any consumers that may still import from '@/types/search'.
export type { Tab } from '@/constants/search'
export { TAB_IDS as TabEnum } from '@/constants/search'

/**
 * Data availability flags for a set of scraped ProductFinancial rows.
 * Source of truth: defined here, re-exported from search-view-helpers for backwards compat.
 */
export interface SearchDataAvailability {
    hasListings: boolean
    hasSignals: boolean
    hasFinancials: boolean
    hasCategories: boolean
    hasImages: boolean
}
