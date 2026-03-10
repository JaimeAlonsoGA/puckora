/**
 * AppRoute
 *
 * Single source of truth for all app route paths.
 * Never write a raw string like '/login' or '/settings' in application code —
 * always import from here so renaming a route is a one-line change.
 */
export const AppRoute = {
    /** Default authenticated landing page */
    home: '/pulse',
    login: '/login',
    signup: '/signup',
    /** Module routes */
    pulse: '/pulse',
    settings: '/settings',
    /** API endpoints */
    apiSettings: '/api/settings',
    apiPulseSearch: '/api/pulse/search',
    apiPulseAmazonMatch: '/api/pulse/amazon-match',
    apiScrapeEnrich: '/api/scrape/enrich',
    /** Search / scraper */
    search: '/search',
} as const

export type AppRoutePath = (typeof AppRoute)[keyof typeof AppRoute]
