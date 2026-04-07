'use client'

import { useTranslations } from 'next-intl'
import { DataCard, DualStat, HeroStat, ProductBox } from '@puckora/ui'
import { formatWeight, type SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'
import { AnimatedMonoNumber } from '../../search-live-animations'

interface WeightStatCardProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
}

export function WeightStatCard({ stats, availability }: WeightStatCardProps) {
    const t = useTranslations('search')

    if (!availability.hasSignals) return <SearchDataCardSkeleton rows={2} />

    const hasDims = !!(stats.median_pkg_length_cm && stats.median_pkg_width_cm && stats.median_pkg_height_cm)

    const subtitle = [
        stats.avg_pkg_weight_kg ? t('weight.stat.averageRange', { range: formatWeight(stats.avg_pkg_weight_kg) }) : undefined,
        stats.weight_range_min_kg && stats.weight_range_max_kg ? t('weight.stat.range', { min: formatWeight(stats.weight_range_min_kg), max: formatWeight(stats.weight_range_max_kg) }) : undefined,
    ].filter(Boolean) as string[]

    return (
        <DataCard
            title={t('weight.stat.card')}
            tooltip={{ title: t('weight.stat.tooltipTitle'), description: t('weight.stat.tooltip') }}
        >
            <HeroStat
                value={<AnimatedMonoNumber value={stats.median_pkg_weight_kg || null} formatter={formatWeight} as="span" />}
                sub={subtitle.length > 0 ? subtitle : undefined}
            />
        </DataCard>
    )
}
