/**
 * Supabase client for the extension.
 *
 * Auth is inherited from the web app — the user logs in on app.puckora.com and
 * the session token is synced here via postMessage. The extension never manages
 * its own auth UI.
 *
 * Session persistence: chrome.storage.local (survives service worker restarts).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@puckora/types'

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// These are public-facing values — safe to bundle in the extension.
const SUPABASE_URL = 'https://your-project.supabase.co'   // replaced at build time
const SUPABASE_ANON_KEY = 'your-anon-key'                  // replaced at build time

export const WEB_APP_ORIGIN = 'https://app.puckora.com'    // replaced at build time

// ─── STORAGE KEYS ─────────────────────────────────────────────────────────────
const STORAGE_KEY_SESSION = 'puckora_session'

// ─── SESSION TYPES ────────────────────────────────────────────────────────────
export interface ExtensionSession {
    access_token: string
    refresh_token: string
    expires_at: number  // epoch ms
}

// ─── SINGLETON CLIENT ─────────────────────────────────────────────────────────
let _client: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
    if (_client) return _client
    _client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false,  // we manage session ourselves via chrome.storage
            autoRefreshToken: false,
        },
    })
    return _client
}

// ─── SESSION MANAGEMENT ───────────────────────────────────────────────────────

/** Persist a session received from the web app. */
export async function saveSession(session: ExtensionSession): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY_SESSION]: session })
    const supabase = getSupabaseClient()
    await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
    })
}

/** Load the stored session and hydrate the client. Returns null if not logged in. */
export async function loadSession(): Promise<ExtensionSession | null> {
    const result = await chrome.storage.local.get(STORAGE_KEY_SESSION)
    const session = result[STORAGE_KEY_SESSION] as ExtensionSession | undefined
    if (!session) return null

    // Hydrate the Supabase client with the stored token
    const supabase = getSupabaseClient()
    await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
    })

    return session
}

/** Clear session on logout. */
export async function clearSession(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY_SESSION)
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    _client = null
}

/** Returns true if a valid session is stored. */
export async function isAuthenticated(): Promise<boolean> {
    const session = await loadSession()
    if (!session) return false
    return session.expires_at > Date.now() + 60_000  // 1 min buffer
}
