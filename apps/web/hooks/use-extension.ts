'use client'

/**
 * useExtension
 *
 * Detects whether the Puckora Chrome extension is installed and active.
 *
 * The extension's service worker injects `window.__puckora_ext = true` into
 * every Puckora web app tab on load (via chrome.scripting.executeScript).
 * We read this flag lazily on mount so SSR always returns isInstalled=false
 * (the flag is browser-only).
 *
 * Usage:
 *   const { isInstalled } = useExtension()
 *   if (!isInstalled) return <InstallPrompt />
 */

import { useState, useEffect } from 'react'

declare global {
    interface Window {
        /** Set by the Puckora Chrome extension service worker */
        __puckora_ext?: boolean
    }
}

export interface UseExtensionReturn {
    /** true once the extension flag has been confirmed present */
    isInstalled: boolean
    /** false while we haven't yet checked (avoids flash on mount) */
    isChecking: boolean
}

export function useExtension(): UseExtensionReturn {
    const [isInstalled, setIsInstalled] = useState(false)
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        // The extension may inject the flag slightly after mount.
        // A short timeout lets the service worker complete its injection.
        const id = setTimeout(() => {
            setIsInstalled(!!window.__puckora_ext)
            setIsChecking(false)
        }, 300)

        return () => clearTimeout(id)
    }, [])

    return { isInstalled, isChecking }
}
