/**
 * Supabase service layer — App user profile.
 *
 * Reads/writes the public.users table which mirrors auth.users via a trigger.
 * The local AppUser type lives in types/users.ts until the migration runs
 * and `npm run gen:types` regenerates @puckora/types.
 */

import type { User as AppUser, UserUpdate as AppUserUpdate } from '@puckora/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

export async function getUser(
    supabase: SupabaseInstance,
    userId: string,
): Promise<AppUser> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) throw new Error(`Failed to fetch user: ${error.message}`)
    return data as AppUser
}

export async function updateUser(
    supabase: SupabaseInstance,
    userId: string,
    update: AppUserUpdate,
): Promise<AppUser> {
    const { data, error } = await supabase
        .from('users')
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single()

    if (error) throw new Error(`Failed to update user: ${error.message}`)
    return data as AppUser
}
