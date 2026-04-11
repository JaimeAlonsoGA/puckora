'use client'

import { useTranslations } from 'next-intl'
import { BarChart, BarChartRow, DataCard } from '@puckora/ui'
import type { SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'
import { REVIEW_TIER_BADGE_CLASS } from '@/constants/search-tiers'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'

interface ReviewsStatCardProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
}

export function SocialSnapshotCard({ stats, availability }: ReviewsStatCardProps) {
    const t = useTranslations('search')
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.SOCIAL_STAT)

    if (!availability.hasSignals || stats.review_buckets.length === 0) {
        return <SearchDataCardSkeleton rows={5} />
    }

    // Top-2 buckets by count get a tier-colored badge; rest stay muted
    const sorted = [...stats.review_buckets].sort((a, b) => b.count - a.count)
    const top2Ranges = new Set(sorted.slice(0, 2).map((b) => b.range))

    return (
        <DataCard
            title={t('reviews.card')}
            {...tutorial}
        >
            <BarChart>
                {stats.review_buckets.map((bucket) => (
                    <BarChartRow
                        key={bucket.range}
                        label={bucket.range}
                        value={bucket.pct}
                        badge={bucket.tier}
                        badgeClassName={top2Ranges.has(bucket.range) ? REVIEW_TIER_BADGE_CLASS[bucket.tier] : undefined}
                    />
                ))}
            </BarChart>
        </DataCard>
    )
}
