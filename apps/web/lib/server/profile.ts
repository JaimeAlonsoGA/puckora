import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import { getProfile } from '@/lib/services/settings'
import { getProfilePreferences } from '@puckora/types/domain'
import type { Profile } from '@puckora/types'
import type { ProfilePreferences } from '@puckora/types/domain'

/**
 * getCachedProfile
 *
 * Per-request memoised profile fetch using React.cache().
 * Multiple Server Components in the same render tree can call this without
 * triggering additional DB queries — React deduplicates within the request.
 *
 * Do NOT use for cross-request caching; profile data is user-specific and
 * must be fresh on every navigation (router.refresh() re-runs the tree).
 */
export const getCachedProfile = cache(async (): Promise<Profile> => {
    const user = await getAuthUser()
    const supabase = await createServerClient()
    return getProfile(supabase, user.id)
})

/**
 * getCachedPreferences
 *
 * Convenience wrapper — reads from getCachedProfile so it adds zero extra
 * DB queries when the profile has already been fetched in the same request.
 */
export const getCachedPreferences = cache(
    async (): Promise<Required<ProfilePreferences>> => {
        const profile = await getCachedProfile()
        return getProfilePreferences(profile)
    },
)
