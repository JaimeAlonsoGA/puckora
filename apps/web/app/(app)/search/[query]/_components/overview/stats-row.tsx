'use client'

import type { SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { PriceStatCard } from './cards/price-stat-card'
import { SocialSnapshotCard } from './cards/socials-stat-card'
import { WeightStatCard } from './cards/weight-stat-card'
import { FbaFeesStatCard } from './cards/fba-fees-stat-card'

interface StatsRowProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
}

export function StatsRow({ stats, availability }: StatsRowProps) {
    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <PriceStatCard stats={stats} availability={availability} />
            <SocialSnapshotCard stats={stats} availability={availability} />
            <WeightStatCard stats={stats} availability={availability} />
            <FbaFeesStatCard stats={stats} availability={availability} />
        </div>
    )
}
