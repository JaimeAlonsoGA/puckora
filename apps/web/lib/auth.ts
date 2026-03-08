import 'server-only'

import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppRoute } from '@/lib/routes'
import type { User } from '@supabase/supabase-js'

/**
 * Get the current authenticated user. Redirects to /login if not authenticated.
 *
 * Wrapped in React.cache so repeated calls within the same render pass are
 * deduplicated — no extra round-trips to the Supabase auth server.
 */
export const getAuthUser = cache(async (): Promise<User> => {
    const supabase = await createServerClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        redirect(AppRoute.login)
    }

    return user
})

/**
 * Get the current user without redirecting — returns null if not authenticated.
 *
 * Wrapped in React.cache so repeated calls within the same render pass are
 * deduplicated — no extra round-trips to the Supabase auth server.
 */
export const getOptionalUser = cache(async (): Promise<User | null> => {
    const supabase = await createServerClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    return user
})
