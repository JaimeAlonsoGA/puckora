'use client'

import { useTranslations } from 'next-intl'
import { DataCard, HeroStat } from '@puckora/ui'
import { formatMoney, type SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'
import { AnimatedMonoNumber } from '../../search-live-animations'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'

interface RevenueStatCardProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
}

export function RevenueStatCard({ stats, availability }: RevenueStatCardProps) {
    const t = useTranslations('search')
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.REVENUE_STAT)

    if (!availability.hasFinancials) return <SearchDataCardSkeleton rows={2} />

    return (
        <DataCard
            title={t('revenue.card')}
            {...tutorial}
        >
            <HeroStat
                value={
                    <AnimatedMonoNumber
                        value={stats.median_monthly_revenue > 0 ? stats.median_monthly_revenue : null}
                        formatter={formatMoney}
                        as="span"
                    />
                }
                sub={[
                    stats.avg_monthly_revenue > 0
                        ? t('revenue.average', { value: formatMoney(stats.avg_monthly_revenue) })
                        : undefined,
                ]}
            />
        </DataCard>
    )
}
