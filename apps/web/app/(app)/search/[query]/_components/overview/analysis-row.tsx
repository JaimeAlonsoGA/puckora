'use client'

import type { SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { BrandDistCard } from './cards/brand-dist-card'
import { PriceDistCard } from './cards/price-dist-card'
import { TopProductsCard } from './cards/top-products-card'
import { WeightDistCard } from './cards/weight-dist-card'

interface AnalysisRowProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
}

export function AnalysisRow({ stats, availability }: AnalysisRowProps) {
    return (
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-[0.92fr_1.08fr] xl:flex-1 xl:min-h-0">
            <TopProductsCard stats={stats} availability={availability} />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:h-full xl:content-start xl:items-start xl:overflow-hidden">
                {/*                 <PriceDistCard stats={stats} availability={availability} /> */}
                {/*                 <WeightDistCard stats={stats} availability={availability} /> */}
                <BrandDistCard className="md:col-span-2" stats={stats} availability={availability} />
            </div>
        </div>
    )
}
