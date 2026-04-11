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
    searchKeyword: '/search/keyword',
    searchAsin: '/search/asin',
    searchDiscover: '/search/discover',
    suppliers: '/suppliers',
    notebook: '/notebook',
    tools: '/tools',
    pucki: '/pucki',
    settings: '/settings',
    /** Category explorer — WIP, not yet implemented */
    categories: '/categories',
    /** API endpoints */
    apiSettings: '/api/settings',
    apiPulseSearch: '/api/pulse/search',
    apiPulseAmazonMatch: '/api/pulse/amazon-match',
    apiScrapeEnrich: '/api/scrape/enrich',
} as const

export type AppRoutePath = (typeof AppRoute)[keyof typeof AppRoute]

/**
 * Encode a keyword as a URL-safe slug.
 *   "ceramic bowl"        → "ceramic-bowl"
 *   "stainless-steel bowl" → "stainless--steel-bowl"  (double-hyphen = literal hyphen)
 */
export function toSearchSlug(keyword: string): string {
    return keyword.replace(/-/g, '--').replace(/\s+/g, '-')
}

/**
 * Decode a search slug back to the original keyword.
 * Inverse of toSearchSlug — roundtrip-safe for any alphanumeric / hyphen / space keyword.
 *
 * Handles two slug formats:
 *   - New style: "ceramic-bowl"   (toSearchSlug — dashes for spaces)
 *   - Legacy:    "ceramic%20bowl" (old encodeURIComponent — percent-encoded spaces)
 *
 * Next.js App Router does not decode path segments before passing them as `params`,
 * so percent-encoded slugs arrive as literal strings (e.g. "ceramic%20bowl").
 * Without decoding here, those strings bypass the dash→space replacement and are
 * passed as-is to URLSearchParams, which re-encodes the `%` to produce `%2520`.
 */
export function fromSearchSlug(slug: string): string {
    let decoded = slug
    try {
        decoded = decodeURIComponent(slug)
    } catch {
        // malformed encoding — proceed with raw slug
    }
    return decoded.replace(/--/g, '\x00').replace(/-/g, ' ').replace(/\x00/g, '-')
}

/** Dynamic route to a product detail page. URL: /search/asin/[asin]. */
export const searchAsinRoute = (asin: string | null | undefined): string => {
    if (!asin) return AppRoute.search
    return `${AppRoute.searchAsin}/${asin}`
}

/** Dynamic route to keyword search results page. URL: /search/keyword/[query]. */
export const searchKeywordRoute = (keyword: string): string =>
    `${AppRoute.searchKeyword}/${toSearchSlug(keyword)}`

/** Discover results root. Search params will provide filters when enabled. */
export const searchDiscoverRoute = (): string => AppRoute.searchDiscover

/** Backward-compatible alias for keyword route generation. */
export const searchQueryRoute = (keyword: string): string => searchKeywordRoute(keyword)

/** Backward-compatible alias for ASIN route generation. */
export const searchProductRoute = (asin: string | null | undefined): string => searchAsinRoute(asin)
