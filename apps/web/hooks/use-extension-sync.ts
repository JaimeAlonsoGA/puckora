'use client'

/**
 * useExtensionSync
 *
 * Pushes the current Supabase session to the Puckora Chrome extension.
 * Called once on mount in the authenticated app layout (via ExtensionSync).
 *
 * Extension detection is delegated to `useExtensionDetection()` so the web app
 * has a single source of truth for the REQUEST/READY handshake.
 *
 * Re-pushes on any Supabase auth state change (login, token refresh).
 */

import { useEffect, useRef } from 'react'
import { createClient } from '@/integrations/supabase/client'
import { useExtensionDetection } from './use-extension-detection'

export function useExtensionSync() {
    const syncedExtId = useRef<string | null>(null)
    const { extId } = useExtensionDetection()

    useEffect(() => {
        async function sync(extId: string) {
            const supabase = createClient()
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) return

            try {
                chrome.runtime.sendMessage(
                    extId,
                    {
                        type: 'SET_SESSION',
                        session: {
                            access_token: session.access_token,
                            refresh_token: session.refresh_token,
                            expires_at: (session.expires_at ?? 0) * 1000,
                            user_id: session.user.id,
                            user_email: session.user.email ?? '',
                        },
                    },
                    () => void chrome.runtime.lastError,
                )
            } catch {
                // Non-fatal
            }
        }

        function trySync(extId: string) {
            if (extId === syncedExtId.current) return
            syncedExtId.current = extId
            void sync(extId)
        }

        if (extId) {
            trySync(extId)
        }

        // Re-sync on auth state changes (login, token refresh)
        const supabase = createClient()
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (
                event === 'SIGNED_IN' ||
                event === 'TOKEN_REFRESHED' ||
                event === 'INITIAL_SESSION'
            ) {
                syncedExtId.current = null
                if (extId) {
                    trySync(extId)
                }
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [extId])
}
