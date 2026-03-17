'use client'

/**
 * useExtensionStatus
 *
 * Combines extension detection with a PING to the extension service worker
 * to determine whether the logged-in web app session is already synced.
 *
 * Detection uses a postMessage REQUEST/READY handshake — no window globals
 * (can't be set from the ISOLATED-world content script), no inline scripts
 * (blocked by CSP).
 *
 * Returns:
 *   status   — 'checking' | 'not-installed' | 'synced' | 'unsynced'
 *   resync   — manually re-pushes the current session to the extension
 *   isSyncing — true while a resync is in-flight (for button loading state)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/integrations/supabase/client'

export type ExtensionStatus = 'checking' | 'not-installed' | 'synced' | 'unsynced'

export interface UseExtensionStatusReturn {
    status: ExtensionStatus
    resync: () => Promise<void>
    isSyncing: boolean
}

/** Send a PING to the extension and call back with the result. */
function pingExtension(extId: string, onResult: (synced: boolean) => void): void {
    try {
        chrome.runtime.sendMessage(extId, { type: 'PING' }, (response) => {
            if (chrome.runtime.lastError) {
                onResult(false)
                return
            }
            onResult(response?.authenticated === true)
        })
    } catch {
        onResult(false)
    }
}

export function useExtensionStatus(): UseExtensionStatusReturn {
    const [installed, setInstalled] = useState<boolean | null>(null)
    const [extId, setExtId] = useState<string | null>(null)
    const [isSynced, setIsSynced] = useState<boolean | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const lastSynced = useRef<boolean | null>(null)

    const applyResult = useCallback((synced: boolean) => {
        if (synced !== lastSynced.current) {
            lastSynced.current = synced
            setIsSynced(synced)
        }
    }, [])

    // Step 1: detect extension via postMessage REQUEST/READY handshake.
    // Phase A: fast requests (150ms × 14 ≈ 2s), Phase B: slow (3s, indefinite).
    useEffect(() => {
        let phaseB: ReturnType<typeof setInterval> | null = null
        let detected = false

        function detect(foundId: string) {
            if (detected) return
            detected = true
            setExtId(foundId)
            setInstalled(true)
            clearInterval(fastId)
            if (phaseB) {
                clearInterval(phaseB)
                phaseB = null
            }
        }

        function request() {
            window.postMessage({ type: 'PUCKORA_EXT_REQUEST' }, '*')
        }

        function onMessage(event: MessageEvent) {
            if (event.source !== window) return
            if (event.data?.type === 'PUCKORA_EXT_READY' && event.data.extId) {
                detect(event.data.extId)
            }
        }
        window.addEventListener('message', onMessage)

        let attempts = 0
        const fastId = setInterval(() => {
            attempts++
            request()
            if (attempts >= 14) {
                clearInterval(fastId)
                setInstalled((prev) => prev ?? false)
                // Phase B: keep requesting for late installs
                phaseB = setInterval(request, 3000)
            }
        }, 150)
        request()

        return () => {
            clearInterval(fastId)
            if (phaseB) clearInterval(phaseB)
            window.removeEventListener('message', onMessage)
        }
    }, [])

    // Step 2: once extId is known, PING periodically to check auth status.
    useEffect(() => {
        if (installed === null) return

        if (installed && !extId) {
            setIsSynced(false)
            return
        }
        if (!installed || !extId) return

        pingExtension(extId, applyResult)
        const id = setInterval(() => pingExtension(extId, applyResult), 3000)
        return () => clearInterval(id)
    }, [installed, extId, applyResult])

    // Step 3: push the web app session to the extension, then confirm with PING.
    const resync = useCallback(async () => {
        if (!extId) return
        setIsSyncing(true)
        setIsSynced(null)
        lastSynced.current = null

        try {
            const supabase = createClient()
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!session) {
                pingExtension(extId, (synced) => {
                    applyResult(synced)
                    setIsSyncing(false)
                })
                return
            }

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
                (response) => {
                    if (chrome.runtime.lastError || !response) {
                        pingExtension(extId, (synced) => {
                            applyResult(synced)
                            setIsSyncing(false)
                        })
                        return
                    }
                    // Give chrome.storage a moment to flush, then confirm
                    setTimeout(() => {
                        pingExtension(extId, (synced) => {
                            applyResult(synced)
                            setIsSyncing(false)
                        })
                    }, 250)
                },
            )
        } catch {
            pingExtension(extId, (synced) => {
                applyResult(synced)
                setIsSyncing(false)
            })
        }
    }, [extId, applyResult])

    const status: ExtensionStatus =
        installed === null || (installed === true && isSynced === null)
            ? 'checking'
            : !installed
                ? 'not-installed'
                : isSynced
                    ? 'synced'
                    : 'unsynced'

    return { status, resync, isSyncing }
}
