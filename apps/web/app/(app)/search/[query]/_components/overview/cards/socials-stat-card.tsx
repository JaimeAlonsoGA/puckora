'use client'

import { useTranslations } from 'next-intl'
import { DataCard, DualStat } from '@puckora/ui'
import { formatCount, formatRating, type SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'
import { AnimatedMonoNumber } from '../../search-live-animations'

interface ReviewsStatCardProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
}

export function SocialSnapshotCard({ stats, availability }: ReviewsStatCardProps) {
    const t = useTranslations('search')

    if (!availability.hasSignals) return <SearchDataCardSkeleton rows={2} />

    return (
        <DataCard
            title={t('socials.card')}
            tooltip={{ title: t('socials.tooltipTitle'), description: t('socials.tooltip') }}
        >
            <DualStat
                primaryValue={<AnimatedMonoNumber value={stats.median_review_count ?? null} formatter={formatCount} as="span" />}
                secondaryValue={<AnimatedMonoNumber value={stats.avg_rating ?? null} formatter={formatRating} as="span" />}
                primaryLabel={t('socials.medianReviews')}
                secondaryLabel={t('socials.medianRating')}
                subtitle={[t('socials.averageRange', { n: formatCount(stats.avg_review_count) })]}
            />
        </DataCard>
    )
}
