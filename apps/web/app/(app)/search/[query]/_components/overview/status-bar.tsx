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
    totalProducts: number
    isJobActive: boolean
    isRefreshing: boolean
    availability: SearchDataAvailability
}

export function StatusBar({ job, totalProducts, isJobActive, isRefreshing, availability }: StatusBarProps) {
    const t = useTranslations('search')
    return (
        <>
            <Stack direction="row" wrap align="center" gap="2">
                <SearchQueryIndicator isJobActive={isJobActive} isRefreshing={isRefreshing} />
                <Caption as="span" className="text-muted-foreground">
                    <AnimatedSpanNumber value={totalProducts} formatter={formatCount} />
                    {' '}{t('overview.productsCount')}
                </Caption>
            </Stack>
            <SearchLiveStatus job={job} availability={availability} />
        </>
    )
}
