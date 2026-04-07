'use client'

import { useTranslations } from 'next-intl'
import { DataCard, DualStat } from '@puckora/ui'
import { FBA_TIER, formatMoney, type FbaTier, type SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'
import { AnimatedMonoNumber } from '../../search-live-animations'

interface FbaFeesStatCardProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
}

export function FbaFeesStatCard({ stats, availability }: FbaFeesStatCardProps) {
    const t = useTranslations('search')

    const fbaTierLabels: Record<FbaTier, string> = {
        [FBA_TIER.SMALL_STANDARD]: t('fees.tierSmallStandard'),
        [FBA_TIER.LARGE_STANDARD]: t('fees.tierLargeStandard'),
        [FBA_TIER.SMALL_OVERSIZE]: t('fees.tierSmallOversize'),
        [FBA_TIER.MEDIUM_OVERSIZE]: t('fees.tierMediumOversize'),
        [FBA_TIER.LARGE_OVERSIZE]: t('fees.tierLargeOversize'),
        [FBA_TIER.SPECIAL_OVERSIZE]: t('fees.tierSpecialOversize'),
        [FBA_TIER.UNKNOWN]: t('fees.tierUnknown'),
    }

    const dominantTier = stats.fba_tier_distribution.find((item) => item.tier !== FBA_TIER.UNKNOWN)

    const subtitle: string[] = stats.fba_tier_distribution
        .filter((item) => item.tier !== FBA_TIER.UNKNOWN && item.pct >= 1)
        .slice(0, 4)
        .map((item) => {
            const fee = item.median_fba_fee != null ? ` · ${formatMoney(item.median_fba_fee)}` : ''
            return `${item.pct}% ${fbaTierLabels[item.tier]}${fee}`
        })

    if (!availability.hasFinancials) return <SearchDataCardSkeleton rows={2} />

    return (
        <DataCard
            title={dominantTier ? t('fees.cardWithTier', { tier: fbaTierLabels[dominantTier.tier] }) : t('fees.card')}
            tooltip={{ title: t('fees.tooltipTitle'), description: t('fees.tooltip') }}
        >
            <DualStat
                primaryValue={<AnimatedMonoNumber value={dominantTier?.median_fba_fee ?? null} formatter={formatMoney} as="span" />}
                secondaryValue={<AnimatedMonoNumber value={dominantTier?.median_referral_fee ?? null} formatter={formatMoney} as="span" />}
                primaryLabel={t('fees.medianFba')}
                secondaryLabel={t('fees.medianReferral')}
                subtitle={subtitle.length ? subtitle : undefined}
            />
        </DataCard>
    )
}
