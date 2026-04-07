'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { DataCard } from '@puckora/ui'
import type { SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'

interface TopProductsCardProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
}

export function TopProductsCard({ stats, availability }: TopProductsCardProps) {
    const t = useTranslations('search')

    if (!availability.hasFinancials) return <SearchDataCardSkeleton rows={4} />

    const products = stats.top_products
        .filter((p) => p.main_image_url)
        .slice(0, 9)

    return (
        <DataCard className="xl:h-full grid grid-cols-3 gap-3 xl:flex-1 xl:min-h-0 xl:grid-rows-3">
            {products.map((product) => (
                <div
                    key={product.asin}
                    className="relative aspect-square w-full h-full overflow-hidden rounded-sm bg-muted"
                >
                    <Image
                        src={product.main_image_url!}
                        alt={product.title ?? ''}
                        fill
                    />
                </div>
            ))}
        </DataCard>
    )
}
