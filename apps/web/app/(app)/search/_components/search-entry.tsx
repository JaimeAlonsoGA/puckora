'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Alert, Button, Display, Body, Stack } from '@puckora/ui'
import { cn } from '@puckora/utils'
import type { AmazonCategory } from '@puckora/types'
import { Tab, TabEnum } from '@/types/search'
import { MODULE_IDS } from '@/constants/app-state'
import { TABS } from '@/constants/search'
import { createScrapeJobAction } from '@/app/(app)/actions'
import { useAppStore } from '@/lib/store'
import { KeywordPanel } from './panels/keyword-panel'
import { CategoryPanel } from './panels/category-panel'
import { ConstraintsPanel } from './panels/constraints-panel'
import { SearchExtensionWidget } from './extension-widget'


// ---------------------------------------------------------------------------
// SearchEntry
// ---------------------------------------------------------------------------

interface SearchEntryProps {
    displayName: string
    categories: AmazonCategory[]
    marketplace: string
}

export function SearchEntry({ displayName, categories, marketplace }: SearchEntryProps) {
    const [activeTab, setActiveTab] = useState<Tab>(TabEnum.KEYWORD)
    const [serverError, setServerError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const t = useTranslations('search')
    const { resetSession, setPuckiContext } = useAppStore()

    useEffect(() => {
        resetSession()
        setPuckiContext({ currentAsin: undefined, currentQuery: undefined, currentModule: MODULE_IDS.SEARCH })
    }, [resetSession, setPuckiContext])

    const [greeting] = useState(() => {
        const hour = new Date().getHours()
        return hour < 12 ? t('greetingMorning') : hour < 18 ? t('greetingAfternoon') : t('greetingEvening')
    })

    function handleSearch(q: string) {
        setServerError(null)
        startTransition(async () => {
            const result = await createScrapeJobAction({ keyword: q, marketplace })
            if (result?.error) {
                setServerError(result.error)
            }
        })
    }

    return (
        <Stack className="h-full items-center justify-center px-8 py-8">
            <div className="w-full max-w-xl">
                {/* Greeting */}
                <Stack gap="2" className="mb-8 text-center">
                    <Display as="h1">{greeting}, {displayName}.</Display>
                    <Body className="text-muted-foreground">{t('entrySubtitle')}</Body>
                </Stack>

                {/* Tabs */}
                <div className="mb-5 flex w-full overflow-hidden rounded-md border border-border-subtle">
                    {TABS.map((tab, idx) => (
                        <Button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            variant="ghost"
                            className={cn(
                                'h-auto flex-1 rounded-none py-2.5 text-center text-sm font-medium',
                                idx < TABS.length - 1 && 'border-r border-r-border-subtle',
                                activeTab === tab.id
                                    ? 'bg-card text-foreground'
                                    : 'text-muted-foreground hover:bg-transparent',
                            )}
                        >
                            {t(tab.labelKey)}
                        </Button>
                    ))}
                </div>

                {serverError && <Alert variant="error">{serverError}</Alert>}

                {/* Tab body */}
                <div className="w-full">
                    {activeTab === TabEnum.KEYWORD && <KeywordPanel onSearch={handleSearch} isPending={isPending} />}
                    {activeTab === TabEnum.CATEGORY && <CategoryPanel categories={categories} onSearch={handleSearch} />}
                    {activeTab === TabEnum.CONSTRAINTS && <ConstraintsPanel onApply={(c) => handleSearch(JSON.stringify(c))} />}
                </div>

                <div className="mt-5">
                    <SearchExtensionWidget />
                </div>
            </div>
        </Stack>
    )
}

