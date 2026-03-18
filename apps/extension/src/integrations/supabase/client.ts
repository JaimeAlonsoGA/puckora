/**
 * Supabase client for the extension.
 *
 * Auth can come from native popup sign-in or a web-app session sync.
 * Session is persisted in chrome.storage.local so it survives service worker
 * restarts and is available to popup/sidebar surfaces.
 *
 * Never import @supabase/ssr here — this is not a Next.js context.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@puckora/types'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/api'
import { STORAGE_KEY_SESSION } from '@/constants/storage'
import type { ExtensionSession } from '@/types/extension'

// ─── SINGLETON CLIENT ──────────────────────────────────────────────────────────

let _client: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
    if (_client) return _client
    _client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false, // we manage session ourselves via chrome.storage
            autoRefreshToken: false,
        },
    })
    return _client
}

// ─── SESSION MANAGEMENT ───────────────────────────────────────────────────────

/** Persist a session received from the web app and hydrate the client. */
export async function saveSession(session: ExtensionSession): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY_SESSION]: session })
    // Hydrate the in-memory Supabase client — fire-and-forget so this never
    // blocks callers or delays sendResponse in the message handler.
    const supabase = getSupabaseClient()
    supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
    }).catch(() => { })
}

/**
 * Load the stored session and hydrate the Supabase client.
 * Returns null if no session is stored.
 */
export async function loadSession(): Promise<ExtensionSession | null> {
    const result = await chrome.storage.local.get(STORAGE_KEY_SESSION)
    const session = result[STORAGE_KEY_SESSION] as ExtensionSession | undefined
    if (!session) return null

    // Hydrate the in-memory Supabase client for subsequent RLS queries.
    // Fire-and-forget — callers don't need to wait for this.
    const supabase = getSupabaseClient()
    supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
    }).catch(() => { })

    return session
}

/** Clear session on logout. */
export async function clearSession(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY_SESSION)
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    _client = null
}

/**
 * Returns true if a non-expired session is stored.
 * Uses a 60s buffer to pre-empt near-expiry failures.
 */
export async function isAuthenticated(): Promise<boolean> {
    const session = await loadSession()
    if (!session) return false
    return session.expires_at > Date.now() + 60_000
}

/**
 * Sign in with email + password directly from the extension.
 * Saves the resulting session to chrome.storage.
 */
export async function signIn(email: string, password: string): Promise<ExtensionSession> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    if (!data.session) throw new Error('No session returned')

    const session: ExtensionSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: (data.session.expires_at ?? 0) * 1000,
        user_id: data.user.id,
        user_email: data.user.email ?? '',
    }
    await saveSession(session)
    return session
}

/**
 * Refresh the stored session using its refresh_token.
 * Returns the updated session, or null if refresh fails.
 */
export async function refreshSession(): Promise<ExtensionSession | null> {
    const current = await loadSession()
    if (!current) return null

    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.refreshSession({
        refresh_token: current.refresh_token,
    })
    if (error || !data.session) return null

    const session: ExtensionSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: (data.session.expires_at ?? 0) * 1000,
        user_id: data.user!.id,
        user_email: data.user!.email ?? current.user_email,
        language: current.language,
    }
    await saveSession(session)
    return session
}
