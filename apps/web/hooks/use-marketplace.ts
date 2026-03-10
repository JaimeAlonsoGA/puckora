'use client'

import { useUserPreferences } from './use-user-preferences'

/**
 * Returns the user's currently selected Amazon marketplace ID (e.g. "US", "DE").
 * Falls back to 'US' while the query is loading.
 *
 * For Server Components, use `getCachedPreferences()` from
 * `@/server/profile` instead.
 */
export function useMarketplace(): string {
    const { marketplace } = useUserPreferences()
    return marketplace
}
