'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Alert, Display, Body, Stack } from '@puckora/ui'
import { MODULE_IDS } from '@/constants/app-state'
import { createScrapeJobAction } from '@/app/(app)/actions'
import { useAppStore } from '@/lib/store'
import { AmazonSearchInputSchema } from '@/schemas/scrape'
import { SearchComposer } from './search-composer'


// ---------------------------------------------------------------------------
// SearchEntry
// ---------------------------------------------------------------------------

interface SearchEntryProps {
    displayName: string
    marketplace: string
}

export function SearchEntry({ displayName, marketplace }: SearchEntryProps) {
    const [serverError, setServerError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const t = useTranslations('search')
    const resetSession = useAppStore((state) => state.resetSession)
    const setPuckiContext = useAppStore((state) => state.setPuckiContext)

    useEffect(() => {
        resetSession()
        setPuckiContext({ currentAsin: undefined, currentQuery: undefined, currentModule: MODULE_IDS.SEARCH })
    }, [resetSession, setPuckiContext])

    const [greeting] = useState(() => {
        const hour = new Date().getHours()
        return hour < 12 ? t('entry.greetingMorning') : hour < 18 ? t('entry.greetingAfternoon') : t('entry.greetingEvening')
    })

    const handleSearch = useCallback((q: string) => {
        setServerError(null)

        const parsedInput = AmazonSearchInputSchema.safeParse({ keyword: q, marketplace })
        if (!parsedInput.success) {
            setServerError(parsedInput.error.issues[0]?.message ?? null)
            return
        }

        startTransition(async () => {
            const result = await createScrapeJobAction(parsedInput.data)
            if (result?.error) {
                setServerError(result.error)
            }
        })
    }, [marketplace])

    return (
        <div className="flex flex-1 flex-col items-center overflow-y-auto px-8 pb-16 pt-[15vh]">
            <div className="w-full max-w-3xl">
                {/* Greeting */}
                <Stack gap="4" className="mb-8 text-center">
                    <Display as="h1" className='font-light'>{greeting}, {displayName}</Display>
                    <Body className="text-muted-foreground">{t('entry.subtitle')}</Body>
                </Stack>

                {serverError && <Alert variant="error" className="mb-4">{serverError}</Alert>}

                <SearchComposer onSearch={handleSearch} isPending={isPending} />
            </div>
        </div>
    )
}

