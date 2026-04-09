'use client'

import { useTranslations } from 'next-intl'
import { BarChart, BarChartRow, DataCard } from '@puckora/ui'
import type { SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'
import { RATING_TIER_BADGE_CLASS } from '@/constants/search-tiers'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'

interface RatingStatCardProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
}

export function RatingStatCard({ stats, availability }: RatingStatCardProps) {
    const t = useTranslations('search')
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.RATING_STAT)

    if (!availability.hasSignals || stats.rating_buckets.length === 0) {
        return <SearchDataCardSkeleton rows={4} />
    }

    // Top-2 buckets by count get a tier-colored badge; rest stay muted
    const sorted = [...stats.rating_buckets].sort((a, b) => b.count - a.count)
    const top2Ranges = new Set(sorted.slice(0, 2).map((b) => b.range))

    return (
        <DataCard
            title={t('rating.card')}
            {...tutorial}
        >
            <BarChart>
                {stats.rating_buckets.map((bucket) => (
                    <BarChartRow
                        key={bucket.range}
                        label={bucket.range}
                        value={bucket.pct}
                        badge={bucket.tier}
                        badgeClassName={top2Ranges.has(bucket.range) ? RATING_TIER_BADGE_CLASS[bucket.tier] : undefined}
                    />
                ))}
            </BarChart>
        </DataCard>
    )
}
