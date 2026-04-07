'use client'

import { useMemo } from 'react'
import type { ProductFinancial, ScrapeJob } from '@puckora/types'
import { computeOverviewStats, getAveragePrice } from '@puckora/utils'
import {
    OverviewLayout,
    OverviewMain,
    OverviewMainContent,
    OverviewSidebar,
} from '@/components/layout/overview-layout'
import { getDataAvailability } from '../search-view-helpers'
import { VerdictPanel } from './sidebar/verdict-panel'
import { CategoryPortal } from './sidebar/category-portal'
import { StatusBar } from './status-bar'
import { StatsRow } from './stats-row'
import { AnalysisRow } from './analysis-row'
import { Ctas } from './ctas'

interface OverviewViewProps {
    products: ProductFinancial[]
    query: string
    onSeeAll: () => void
    job: ScrapeJob | null
    marketplace: string
    isJobActive: boolean
    isRefreshing: boolean
}

export function OverviewView({
    products, query, onSeeAll, job, marketplace, isJobActive, isRefreshing,
}: OverviewViewProps) {
    const stats = useMemo(() => computeOverviewStats(products), [products])
    const availability = useMemo(() => getDataAvailability(products), [products])
    const averagePrice = useMemo(() => getAveragePrice(products), [products])
    const sweetSpot = stats.price_buckets.find((b) => b.is_sweet)

    return (
        <OverviewLayout>
            <OverviewSidebar>
                <VerdictPanel
                    products={products}
                    stats={stats}
                    averagePrice={averagePrice}
                    query={query}
                    marketplace={marketplace}
                />
                {availability.hasCategories && stats.top_categories.length > 0 && (
                    <CategoryPortal categories={stats.top_categories} />
                )}
            </OverviewSidebar>
            <OverviewMain>
                <OverviewMainContent>
                    <StatusBar
                        job={job}
                        totalProducts={stats.total_products}
                        isJobActive={isJobActive}
                        isRefreshing={isRefreshing}
                        availability={availability}
                    />
                    <StatsRow
                        stats={stats}
                        availability={availability}
                    />
                    <AnalysisRow
                        stats={stats}
                        availability={availability}
                    />
                    <Ctas
                        totalProducts={stats.total_products}
                        newListingsCount={stats.new_listings_count}
                        sweetSpot={sweetSpot}
                        onSeeAll={onSeeAll}
                    />
                </OverviewMainContent>
            </OverviewMain>
        </OverviewLayout>
    )
}
