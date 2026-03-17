/**
 * Providers — wraps the React app in extension-specific providers.
 *
 * Used by both the popup and the sidebar overlay.
 */
import { type ReactNode, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18next from 'i18next'
import { useAuthStore } from '@/stores/auth.store'
import { detectLocale } from '@/i18n/setup'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})

import { STORAGE_KEY_SESSION } from '@/constants/storage'

function AuthHydrator({ children }: { children: ReactNode }) {
    const hydrate = useAuthStore((s) => s.hydrate)
    const sessionLanguage = useAuthStore((s) => s.session?.language)

    // Apply stored locale on first mount (async: reads chrome.storage)
    useEffect(() => {
        detectLocale().then((locale) => {
            if (i18next.language !== locale) i18next.changeLanguage(locale)
        })
    }, [])

    // Override locale once the auth session (with user preference) hydrates
    useEffect(() => {
        if (sessionLanguage && i18next.language !== sessionLanguage) {
            i18next.changeLanguage(sessionLanguage)
        }
    }, [sessionLanguage])

    useEffect(() => {
        hydrate()

        // Re-hydrate whenever chrome.storage changes — catches the web app
        // pushing a session via useExtensionSync so the popup transitions
        // from AuthGate → Dashboard automatically without a second login.
        function onStorageChange(changes: Record<string, chrome.storage.StorageChange>) {
            if (STORAGE_KEY_SESSION in changes) hydrate()
        }
        chrome.storage.onChanged.addListener(onStorageChange)
        return () => chrome.storage.onChanged.removeListener(onStorageChange)
    }, [hydrate])

    return <>{children}</>
}

export function Providers({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthHydrator>{children}</AuthHydrator>
        </QueryClientProvider>
    )
}
