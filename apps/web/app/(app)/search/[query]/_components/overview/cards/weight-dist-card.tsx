'use client'

import { useTranslations } from 'next-intl'
import { BarChart, BarChartRow, DataCard } from '@puckora/ui'
import type { SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'

interface WeightDistCardProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
    className?: string
}

export function WeightDistCard({ stats, availability, className }: WeightDistCardProps) {
    const t = useTranslations('search')

    if (!availability.hasSignals || stats.weight_buckets.length === 0) {
        return <SearchDataCardSkeleton rows={5} />
    }

    return (
        <DataCard
            className={className}
            title={t('weight.dist.card')}
            tooltip={{ title: t('weight.dist.tooltipTitle'), description: t('weight.dist.tooltip') }}
        >
            <BarChart>
                {stats.weight_buckets.map((bucket) => (
                    <BarChartRow key={bucket.range} label={bucket.range} value={bucket.pct} />
                ))}
            </BarChart>
        </DataCard>
    )
}