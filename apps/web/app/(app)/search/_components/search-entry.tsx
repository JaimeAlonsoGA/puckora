'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import type { Route } from 'next'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Alert, Caption, Display, Body, Mono, Stack } from '@puckora/ui'
import { MODULE_IDS } from '@/constants/app-state'
import { createKeywordSearchJobAction } from '@/app/(app)/actions'
import { searchKeywordRoute, searchProductRoute, searchDiscoverRoute } from '@/constants/routes'
import { CONSTRAINT_FIELD_IDS } from '@/constants/search'
import { useAppStore } from '@/lib/store'
import { SearchComposer, type SearchComposerSubmitPayload } from './search-composer'


// ---------------------------------------------------------------------------
// SearchEntry
// ---------------------------------------------------------------------------

interface SearchEntryProps {
    displayName: string
    marketplace: string
}

export function SearchEntry({ displayName, marketplace }: SearchEntryProps) {
    const [serverError, setServerError] = useState<string | null>(null)
    const [pendingLabel, setPendingLabel] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const t = useTranslations('search')
    const router = useRouter()
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

    const handleSubmit = useCallback((payload: SearchComposerSubmitPayload) => {
        setServerError(null)

        if (payload.type === 'asin') {
            setPendingLabel(payload.asin)
            startTransition(() => {
                router.push(searchProductRoute(payload.asin) as Route)
            })
            return
        }

        if (payload.type === 'discover') {
            const p = new URLSearchParams()
            const price = payload.constraints[CONSTRAINT_FIELD_IDS.PRICE]
            const rating = payload.constraints[CONSTRAINT_FIELD_IDS.RATING]
            const reviews = payload.constraints[CONSTRAINT_FIELD_IDS.REVIEWS]
            if (price?.min) p.set('minPrice', price.min)
            if (price?.max) p.set('maxPrice', price.max)
            if (rating?.min) p.set('minRating', rating.min)
            if (reviews?.min) p.set('minReviews', reviews.min)
            startTransition(() => {
                router.push(searchDiscoverRoute(p) as Route)
            })
            return
        }

        setPendingLabel(payload.keyword)

        startTransition(async () => {
            const result = await createKeywordSearchJobAction({
                keyword: payload.keyword,
                marketplace,
            })

            if (result && 'error' in result) {
                setServerError(result.error)
                return
            }

            if (!result) {
                setServerError(t('entry.keywordLaunchFailed'))
                return
            }

            router.push(`${searchKeywordRoute(result.keyword)}?job=${result.jobId}` as Route)
        })
    }, [marketplace, router, t])

    return (
        <div className="relative flex flex-1 flex-col">
            {/* Optimistic overlay — scoped to the entry content area only */}
            {isPending && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-8 text-center">
                        <span className="relative flex h-4 w-4" aria-hidden="true">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                            <span className="relative inline-flex h-4 w-4 rounded-full bg-brand-500" />
                        </span>
                        <Stack direction="column" gap="3" align="center">
                            <Caption className="font-mono uppercase tracking-[0.2em] text-brand-500 animate-pulse">
                                {t('entry.pendingLabel')}
                            </Caption>
                            {pendingLabel && (
                                <Mono as="p" className="text-xl text-foreground/80">
                                    &ldquo;{pendingLabel}&rdquo;
                                </Mono>
                            )}
                        </Stack>
                    </div>
                </div>
            )}

            <div className="flex flex-1 flex-col items-center overflow-y-auto px-8 pb-16 pt-[15vh]">
                <div className="w-full max-w-3xl">
                    {/* Greeting */}
                    <Stack gap="4" className="mb-8 text-center">
                        <Display as="h1" className='font-light'>{greeting}, {displayName}</Display>
                        <Body className="text-muted-foreground">{t('entry.subtitle')}</Body>
                    </Stack>

                    {serverError && <Alert variant="error" className="mb-4">{serverError}</Alert>}

                    <SearchComposer onSubmit={handleSubmit} isPending={isPending} />
                </div>
            </div>
        </div>
    )
}

