import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export interface AuthUser {
    id: string
    email: string
}

export async function validateAuth(supabase: SupabaseClient): Promise<AuthUser> {
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
        throw new Error('Unauthorized: Invalid or missing token')
    }

    return {
        id: data.user.id,
        email: data.user.email ?? '',
    }
}

/**
 * Ensure a user's profile exists via a SECURITY DEFINER function.
 * This bypasses RLS safely while maintaining explicit authorization.
 */
export async function ensureProfileExists(
    supabase: SupabaseClient,
    userId: string,
    email: string,
): Promise<void> {
    const { error } = await supabase.rpc('ensure_user_profile_exists', {
        p_user_id: userId,
        p_email: email,
        p_full_name: null,
        p_avatar_url: null,
    })

    if (error) {
        console.error('[auth] ensure_user_profile_exists failed:', error)
        throw new Error(`Failed to ensure profile exists: ${error.message}`)
    }
}
