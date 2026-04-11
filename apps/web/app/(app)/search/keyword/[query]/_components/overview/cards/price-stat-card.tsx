'use client'

import { useTranslations } from 'next-intl'
import { DataCard, HeroStat } from '@puckora/ui'
import { formatMoney, type SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'
import { AnimatedMonoNumber } from '@/app/(app)/search/_components/animated-numbers'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'

interface PriceStatCardProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
}

export function PriceStatCard({ stats, availability }: PriceStatCardProps) {
    const t = useTranslations('search')
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.PRICE_STAT)

    if (!availability.hasSignals || stats.avg_price === 0) return <SearchDataCardSkeleton rows={2} />

    return (
        <DataCard
            title={t('price.card')}
            {...tutorial}
        >
            <HeroStat
                value={<AnimatedMonoNumber value={stats.median_price > 0 ? stats.median_price : null} formatter={formatMoney} as="span" />}
                sub={[
                    stats.avg_price > 0 ? t('price.averageRange', { range: formatMoney(stats.avg_price) }) : undefined,
                    stats.price_range_max > 0 ? t('price.range', { min: formatMoney(stats.price_range_min), max: formatMoney(stats.price_range_max) }) : undefined,
                ]}
            />
        </DataCard>
    )
}
