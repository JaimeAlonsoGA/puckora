/**
 * Auth store — holds the user's session state.
 *
 * Backed by chrome.storage.local. On mount, rehydrates from storage.
 * Changes are synced back to storage so other extension contexts stay in sync.
 */
import { create } from 'zustand'
import { STORAGE_KEY_SESSION } from '@/constants/storage'
import { getSupabaseClient, signIn as supabaseSignIn, refreshSession, saveSession } from '@/integrations/supabase/client'
import type { ExtensionSession } from '@/types/extension'

interface AuthState {
    session: ExtensionSession | null
    isAuthenticated: boolean
    /** Called once on app mount — loads session from chrome.storage. */
    hydrate: () => Promise<void>
    /** Sign in with email + password via Supabase directly. */
    signIn: (email: string, password: string) => Promise<void>
    setSession: (session: ExtensionSession) => void
    clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    isAuthenticated: false,

    async hydrate() {
        const result = await chrome.storage.local.get(STORAGE_KEY_SESSION)
        const raw = result[STORAGE_KEY_SESSION] as ExtensionSession | undefined
        if (!raw) return

        // If expired or expiring within 5 min, try to silently refresh
        if (raw.expires_at < Date.now() + 5 * 60_000) {
            const fresh = await refreshSession()
            if (!fresh) return // refresh failed — user must re-login
            set({ session: fresh, isAuthenticated: true })
            return
        }

        set({ session: raw, isAuthenticated: true })

        // Authenticate the Supabase client so query RLS respects the user's identity.
        // Fire-and-forget — isAuthenticated is already set above.
        const supabase = getSupabaseClient()
        supabase.auth.setSession({
            access_token: raw.access_token,
            refresh_token: raw.refresh_token,
        }).catch(() => { })
    },

    async signIn(email, password) {
        const session = await supabaseSignIn(email, password)
        set({ session, isAuthenticated: true })
    },

    setSession(session) {
        // saveSession writes to chrome.storage.local — fire-and-forget is fine
        // because isAuthenticated() always reads from storage directly.
        saveSession(session).catch(() => { })
        set({ session, isAuthenticated: session.expires_at > Date.now() + 60_000 })
    },

    clearSession() {
        chrome.storage.local.remove(STORAGE_KEY_SESSION)
        const supabase = getSupabaseClient()
        supabase.auth.signOut().catch(() => { })
        set({ session: null, isAuthenticated: false })
    },
}))
