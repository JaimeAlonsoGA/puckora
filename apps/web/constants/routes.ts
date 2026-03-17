/**
 * AppRoute
 *
 * Single source of truth for all app route paths.
 * Never write a raw string like '/login' or '/settings' in application code —
 * always import from here so renaming a route is a one-line change.
 */
export const AppRoute = {
    /** Default authenticated landing page */
    home: '/search',
    login: '/login',
    signup: '/signup',
    /** Module routes */
    search: '/search',
    suppliers: '/suppliers',
    notebook: '/notebook',
    tools: '/tools',
    pucki: '/pucki',
    settings: '/settings',
    /** API endpoints */
    apiSettings: '/api/settings',
    apiPulseSearch: '/api/pulse/search',
    apiPulseAmazonMatch: '/api/pulse/amazon-match',
    apiScrapeEnrich: '/api/scrape/enrich',
} as const

export type AppRoutePath = (typeof AppRoute)[keyof typeof AppRoute]
