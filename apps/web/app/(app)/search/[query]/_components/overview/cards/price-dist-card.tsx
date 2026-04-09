'use client'

import { useTranslations } from 'next-intl'
import { BarChart, BarChartRow, DataCard } from '@puckora/ui'
import type { SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'

interface PriceDistCardProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
    className?: string
}

export function PriceDistCard({ stats, availability, className }: PriceDistCardProps) {
    const t = useTranslations('search')

    if (!availability.hasSignals || stats.price_buckets.length === 0) {
        return <SearchDataCardSkeleton rows={5} />
    }

    return (
        <DataCard
            className={className}
            title={t('price.dist')}
            tooltip={{ title: t('price.distTooltipTitle'), description: t('price.distTooltip') }}
        >
            <BarChart>
                {stats.price_buckets.map((bucket) => (
                    <BarChartRow
                        key={bucket.range}
                        label={bucket.range}
                        value={bucket.pct}
                    />
                ))}
            </BarChart>
        </DataCard>
    )
}
