'use client'

import { useTranslations } from 'next-intl'
import { Body, Caption, Mono, Stack, Surface } from '@puckora/ui'
import {
    SearchDataCardSkeleton,
    SearchMetricCardSkeleton,
} from '@/app/(app)/search/_skeletons/search-results-skeleton'

interface SearchActiveScanStateProps {
    query: string
}

export function SearchActiveScanState({ query }: SearchActiveScanStateProps) {
    const t = useTranslations('search')

    return (
        <Stack direction="column" gap="4">
            {/* Scan hero */}
            <Surface variant="card" padding="xl">
                <Stack direction="column" gap="4">
                    <Stack direction="row" gap="2" align="center">
                        <span className="relative flex h-2.5 w-2.5 flex-none" aria-hidden="true">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
                        </span>
                        <Caption className="animate-pulse font-mono uppercase tracking-widest text-brand-500">
                            {t('shell.jobInProgress')}
                        </Caption>
                    </Stack>
                    <Mono as="p" className="text-2xl">
                        &ldquo;{query}&rdquo;
                    </Mono>
                    <Body className="max-w-2xl text-muted-foreground">
                        {t('liveStatus.collectingBody')}
                    </Body>
                </Stack>
            </Surface>

            {/* Metric card skeletons */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <SearchMetricCardSkeleton />
                <SearchMetricCardSkeleton />
                <SearchMetricCardSkeleton />
                <SearchMetricCardSkeleton />
            </div>

            {/* Data card skeletons */}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <SearchDataCardSkeleton rows={5} />
                <SearchDataCardSkeleton rows={5} />
                <SearchDataCardSkeleton rows={5} />
            </div>
        </Stack>
    )
}
