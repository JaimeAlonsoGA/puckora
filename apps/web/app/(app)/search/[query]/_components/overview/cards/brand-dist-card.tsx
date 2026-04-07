'use client'

import { useTranslations } from 'next-intl'
import { Body, DataCard, ShareStack, ShareStackRow } from '@puckora/ui'
import { formatCount } from '@puckora/utils'
import type { SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'

interface BrandDistCardProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
    className?: string
}

export function BrandDistCard({ stats, availability, className }: BrandDistCardProps) {
    const t = useTranslations('search')

    if (!availability.hasSignals || stats.brand_distribution.length === 0) {
        return <SearchDataCardSkeleton rows={5} />
    }

    return (
        <DataCard
            className={className}
            title={t('brands.card')}
            tooltip={{ title: t('brands.tooltipTitle'), description: t('brands.tooltip') }}
        >
            <Body className="mb-3 text-sm text-muted-foreground">
                {t('brands.summary', { count: formatCount(stats.unique_brands) })}
            </Body>
            <ShareStack>
                {stats.brand_distribution.map((brand, index) => (
                    <ShareStackRow
                        key={brand.name}
                        label={brand.name}
                        value={brand.pct}
                        sub={t('categories.productCount', { count: formatCount(brand.count) })}
                        highlight={index === 0}
                    />
                ))}
            </ShareStack>
        </DataCard>
    )
}