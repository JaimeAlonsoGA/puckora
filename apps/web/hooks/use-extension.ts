/**
 * useExtension
 *
 * Detects whether the Puckora Chrome extension is installed and active.
 *
 * The REQUEST/READY handshake is implemented once in `useExtensionDetection()`
 * and shared by all extension-aware hooks so detection timing stays consistent.
 */

import { useExtensionDetection } from './use-extension-detection'

export interface UseExtensionReturn {
    /** true once the extension has been confirmed present */
    isInstalled: boolean
    /** true while the initial 2s detection window hasn't closed yet */
    isChecking: boolean
}

export function useExtension(): UseExtensionReturn {
    const { isInstalled, isChecking } = useExtensionDetection()
    return { isInstalled, isChecking }
}
