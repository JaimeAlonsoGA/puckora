'use client'

import { useTranslations } from 'next-intl'
import { DataCard, HeroStat } from '@puckora/ui'
import { formatMoney, type SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'
import { AnimatedMonoNumber } from '@/app/(app)/search/_components/animated-numbers'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'

interface FbaFeesStatCardProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
}

export function FbaFeesStatCard({ stats, availability }: FbaFeesStatCardProps) {
    const t = useTranslations('search')
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.FBA_FEES_STAT)

    if (!availability.hasFinancials) return <SearchDataCardSkeleton rows={2} />

    const totalFee = stats.avg_fba_fee + stats.avg_referral_fee || null

    return (
        <DataCard
            title={t('fees.card')}
            {...tutorial}
        >
            <HeroStat
                value={<AnimatedMonoNumber value={totalFee} formatter={formatMoney} as="span" />}
                sub={[
                    stats.avg_fba_fee ? `${t('fees.medianFba')}: ${formatMoney(stats.avg_fba_fee)}` : undefined,
                    stats.avg_referral_fee ? `${t('fees.medianReferral')}: ${formatMoney(stats.avg_referral_fee)}` : undefined,
                ]}
            />
        </DataCard>
    )
}
