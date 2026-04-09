'use client'

import type { SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { PriceStatCard } from './cards/price-stat-card'
import { RatingStatCard } from './cards/rating-stat-card'
import { SocialSnapshotCard } from './cards/socials-stat-card'
import { FbaFeesStatCard } from './cards/fba-fees-stat-card'
import { RevenueStatCard } from './cards/revenue-stat-card'

interface StatsRowProps {
    stats: SearchOverviewStats
    availability: SearchDataAvailability
}

export function StatsRow({ stats, availability }: StatsRowProps) {
    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <PriceStatCard stats={stats} availability={availability} />
            <RatingStatCard stats={stats} availability={availability} />
            <SocialSnapshotCard stats={stats} availability={availability} />
            <FbaFeesStatCard stats={stats} availability={availability} />
            <RevenueStatCard stats={stats} availability={availability} />
        </div>
    )
}
