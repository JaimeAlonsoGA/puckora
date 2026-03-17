'use client'

/**
 * Providers
 *
 * Single client component boundary at the root of the tree.
 * All client-side infrastructure (QueryClient, next-intl, LinkProvider) lives here.
 * `children` is passed as a prop from the Server Component layout,
 * so page Server Components are never pulled into this client boundary.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NextIntlClientProvider } from 'next-intl'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'
import type { AbstractIntlMessages } from 'next-intl'
import Link from 'next/link'
import { LinkProvider, type LinkComponent } from '@puckora/ui'

type ProvidersProps = {
    children: React.ReactNode
    locale: string
    messages: AbstractIntlMessages
    timeZone?: string
}

export function Providers({ children, locale, messages, timeZone }: ProvidersProps) {
    // useState so each browser session gets its own QueryClient instance
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Preferences and profile data are user-specific — stale after 30s
                        staleTime: 30_000,
                        // Retry once on network errors, not on 4xx
                        retry: (failureCount, error) => {
                            if (error instanceof Error && error.message.includes('4')) return false
                            return failureCount < 1
                        },
                    },
                },
            }),
    )

    return (
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
            <LinkProvider linkComponent={Link as LinkComponent}>
                <QueryClientProvider client={queryClient}>
                    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
                        {children}
                    </NextIntlClientProvider>
                </QueryClientProvider>
            </LinkProvider>
        </ThemeProvider>
    )
}

