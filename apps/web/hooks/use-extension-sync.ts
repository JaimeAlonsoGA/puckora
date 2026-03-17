'use client'

/**
 * useExtensionSync
 *
 * Pushes the current Supabase session to the Puckora Chrome extension.
 * Called once on mount in the authenticated app layout (via ExtensionSync).
 *
 * Detection uses a postMessage REQUEST/READY handshake — no window globals
 * (can't be set from the ISOLATED-world content script), no inline scripts
 * (blocked by CSP).
 *
 * Re-pushes on any Supabase auth state change (login, token refresh).
 */

import { useEffect, useRef } from 'react'
import { createClient } from '@/integrations/supabase/client'

export function useExtensionSync() {
    const syncedExtId = useRef<string | null>(null)

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
            sync(extId)
        }

        function request() {
            window.postMessage({ type: 'PUCKORA_EXT_REQUEST' }, '*')
        }

        function onMessage(event: MessageEvent) {
            if (event.source !== window) return
            if (event.data?.type === 'PUCKORA_EXT_READY' && event.data.extId) {
                trySync(event.data.extId)
            }
        }
        window.addEventListener('message', onMessage)

        // Phase A: fast requests every 150ms for 2s
        let attempts = 0
        let phaseB: ReturnType<typeof setInterval> | null = null
        const fastId = setInterval(() => {
            attempts++
            request()
            if (attempts >= 14) {
                clearInterval(fastId)
                phaseB = setInterval(request, 3000)
            }
        }, 150)
        request()

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
                request()
            }
        })

        return () => {
            clearInterval(fastId)
            if (phaseB) clearInterval(phaseB)
            window.removeEventListener('message', onMessage)
            subscription.unsubscribe()
        }
    }, [])
}
