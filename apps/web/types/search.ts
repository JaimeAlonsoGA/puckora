/**
 * Data availability flags for a set of scraped ProductFinancial rows.
 * Source of truth for search-result completeness checks.
 */
export interface SearchDataAvailability {
    hasListings: boolean
    hasSignals: boolean
    hasFinancials: boolean
    hasCategories: boolean
    hasImages: boolean
}
