/**
 * Server-side React.cache wrappers for app user data.
 *
 * Replaces server/profile.ts — reads from the public.users table that is
 * kept in sync with auth.users via the handle_new_user trigger.
 */
import 'server-only'

import { cache } from 'react'
import { createServerClient } from '@/integrations/supabase/server'
import { getAuthUser } from '@/server/auth'
import { getUser } from '@/services/settings'
import type { User } from '@puckora/types'

/**
 * Returns the current user's public.users row.
 * Deduplicated per request via React.cache.
 * Logs out redirecting to /login if not authenticated.
 */
export const getCachedUser = cache(async (): Promise<User> => {
    const authUser = await getAuthUser()
    const supabase = await createServerClient()
    return getUser(supabase, authUser.id)
})
