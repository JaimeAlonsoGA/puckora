import type { Profile, ProfileUpdate } from '@puckora/types'
import type { SettingsUpdateInput } from '@puckora/types/schemas'
import type { ProfilePreferences } from '@puckora/types/domain'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client type varies between createServerClient/createBrowserClient
type SupabaseInstance = any

export async function getProfile(
    supabase: SupabaseInstance,
    userId: string,
): Promise<Profile> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) throw new Error(`Failed to fetch profile: ${error.message}`)
    return data as Profile
}

export async function updateProfile(
    supabase: SupabaseInstance,
    userId: string,
    input: SettingsUpdateInput,
): Promise<Profile> {
    // Separate direct columns from preferences-stored fields
    const { marketplace, language, ...directUpdates } = input

    // Fetch current preferences so we can merge without losing other prefs
    let mergedPreferences: ProfilePreferences | undefined
    if (marketplace !== undefined || language !== undefined) {
        const current = await getProfile(supabase, userId)
        const currentPrefs = (current.preferences ?? {}) as ProfilePreferences
        mergedPreferences = {
            ...currentPrefs,
            ...(marketplace !== undefined && { marketplace }),
            ...(language !== undefined && { language }),
        }
    }

    const updates: Partial<ProfileUpdate> = {
        ...directUpdates,
        updated_at: new Date().toISOString(),
        ...(mergedPreferences !== undefined && { preferences: mergedPreferences }),
    }

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

    if (error) throw new Error(`Failed to update profile: ${error.message}`)
    return data as Profile
}
