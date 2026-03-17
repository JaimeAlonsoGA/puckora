'use client'

/**
 * useExtension
 *
 * Detects whether the Puckora Chrome extension is installed and active.
 *
 * Uses a postMessage REQUEST/READY handshake with the web-app-bridge content
 * script (ISOLATED world). Script-tag injection is not used — the web app's
 * CSP blocks inline scripts.
 *
 * Flow:
 *  1. On mount: send PUCKORA_EXT_REQUEST and listen for PUCKORA_EXT_READY.
 *  2. Phase A: re-send REQUEST every 150ms for up to 2s (fast detection).
 *  3. Phase B: re-send REQUEST every 3s indefinitely (late-install detection).
 *  4. After 2s without a reply: mark as not-installed but keep Phase B running.
 */

import { useState, useEffect } from 'react'

export interface UseExtensionReturn {
    /** true once the extension has been confirmed present */
    isInstalled: boolean
    /** true while the initial 2s detection window hasn't closed yet */
    isChecking: boolean
}

export function useExtension(): UseExtensionReturn {
    const [isInstalled, setIsInstalled] = useState(false)
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        let phaseB: ReturnType<typeof setInterval> | null = null
        let detected = false

        function found() {
            if (detected) return
            detected = true
            setIsInstalled(true)
            setIsChecking(false)
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
            if (event.data?.type === 'PUCKORA_EXT_READY') found()
        }
        window.addEventListener('message', onMessage)

        // Phase A: send REQUEST every 150ms for up to 2s
        let attempts = 0
        const fastId = setInterval(() => {
            attempts++
            request()
            if (attempts >= 14) {
                clearInterval(fastId)
                setIsChecking(false)
                // Phase B: keep requesting for late installs
                phaseB = setInterval(request, 3000)
            }
        }, 150)

        // Fire the first request immediately
        request()

        return () => {
            clearInterval(fastId)
            if (phaseB) clearInterval(phaseB)
            window.removeEventListener('message', onMessage)
        }
    }, [])

    return { isInstalled, isChecking }
}
