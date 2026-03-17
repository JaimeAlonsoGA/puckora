'use client'

import { useExtensionSync } from '@/hooks/use-extension-sync'

/** Invisible client island — fires once per authenticated mount to push the session to the extension. */
export function ExtensionSync() {
    useExtensionSync()
    return null
}
