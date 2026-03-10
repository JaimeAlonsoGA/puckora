'use client'

import { useQuery } from '@tanstack/react-query'
import { userQueryOptions } from '@/queries/users'
import { DEFAULT_MARKETPLACE, DEFAULT_LANGUAGE } from '@puckora/types'

/**
 * Returns the current user's marketplace and language preferences.
 * For Server Components, read user.marketplace / user.language directly
 * from getCachedUser() — no network call.
 */
export function useUserPreferences() {
    const { data: user } = useQuery(userQueryOptions())
    return {
        marketplace: user?.marketplace ?? DEFAULT_MARKETPLACE,
        language: user?.language ?? DEFAULT_LANGUAGE,
    }
}
