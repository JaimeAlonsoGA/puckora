'use client'

import { useQuery } from '@tanstack/react-query'
import { getProfilePreferences } from '@puckora/types/domain'
import type { Profile } from '@puckora/types'

/**
 * Fetches the user's profile via the /api/settings endpoint and returns their
 * current preferences. TanStack Query caches the response and deduplicates
 * concurrent requests across all components.
 *
 * For Server Components, use `getCachedPreferences()` from
 * `@/lib/server/profile` instead — no network round-trip needed there.
 */
export function useUserPreferences() {
    return useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const res = await fetch('/api/settings')
            if (!res.ok) throw new Error('Failed to fetch profile')
            const profile = (await res.json()) as Profile
            return getProfilePreferences(profile)
        },
    })
}
