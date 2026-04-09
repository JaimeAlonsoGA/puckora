'use client'

import { useTranslations } from 'next-intl'
import { Caption, Stack } from '@puckora/ui'
import { formatCount } from '@puckora/utils'
import type { ScrapeJob } from '@puckora/types'
import type { SearchDataAvailability } from '@/types/search'
import { SearchQueryIndicator } from '../search-query-indicator'
import { SearchLiveStatus } from '../search-live-status'
import { AnimatedSpanNumber } from '../search-live-animations'

interface StatusBarProps {
    job: ScrapeJob | null
    sampledCount: number
    totalResults: number | null
    isJobActive: boolean
    isRefreshing: boolean
    availability: SearchDataAvailability
}

export function StatusBar({ job, sampledCount, totalResults, isJobActive, isRefreshing, availability }: StatusBarProps) {
    const t = useTranslations('search')
    return (
        <>
            <Stack direction="row" wrap align="center" gap="2">
                {(sampledCount > 0 || !isJobActive) && (
                    <Caption as="span" className="text-muted-foreground">
                        <AnimatedSpanNumber value={sampledCount} formatter={formatCount} />
                        {' '}{t('overview.sampledCount')}
                    </Caption>
                )}
                <SearchQueryIndicator isJobActive={isJobActive} isRefreshing={isRefreshing} />
                {totalResults != null && (
                    <Caption as="span" className="text-muted-foreground">
                        <AnimatedSpanNumber value={totalResults} formatter={formatCount} />
                        {' '}{t('overview.totalResultsCount')}
                    </Caption>
                )}
            </Stack>
            <SearchLiveStatus job={job} availability={availability} />
        </>
    )
}
