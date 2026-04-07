'use client'

/**
 * useExtensionStatus
 *
 * Combines extension detection with a PING to the extension service worker
 * to determine whether the logged-in web app session is already synced.
 *
 * Detection comes from `useExtensionDetection()`, which centralizes the
 * REQUEST/READY handshake used across the web app.
 *
 * Returns:
 *   status   — 'checking' | 'not-installed' | 'synced' | 'unsynced'
 *   resync   — manually re-pushes the current session to the extension
 *   isSyncing — true while a resync is in-flight (for button loading state)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/integrations/supabase/client'
import { useExtensionDetection } from './use-extension-detection'

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
    const [isSynced, setIsSynced] = useState<boolean | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const lastSynced = useRef<boolean | null>(null)
    const { extId, isInstalled, isChecking } = useExtensionDetection()

    const applyResult = useCallback((synced: boolean) => {
        if (synced !== lastSynced.current) {
            lastSynced.current = synced
            setIsSynced(synced)
        }
    }, [])

    // Step 1: once extId is known, PING periodically to check auth status.
    useEffect(() => {
        if (isInstalled && !extId) {
            setIsSynced(false)
            return
        }
        if (!isInstalled || !extId) return

        pingExtension(extId, applyResult)
        const id = setInterval(() => pingExtension(extId, applyResult), 3000)
        return () => clearInterval(id)
    }, [isInstalled, extId, applyResult])

    // Step 2: push the web app session to the extension, then confirm with PING.
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
        isChecking || (isInstalled && isSynced === null)
            ? 'checking'
            : !isInstalled
                ? 'not-installed'
                : isSynced
                    ? 'synced'
                    : 'unsynced'

    return { status, resync, isSyncing }
}
