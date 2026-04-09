'use client'

import { useMemo } from 'react'
import type { ProductFinancial, ScrapeJob } from '@puckora/types'
import { computeOverviewStats } from '@puckora/utils'
import {
    OverviewLayout,
    OverviewMain,
    OverviewMainContent,
    OverviewSidebar,
} from '@/components/layout/overview-layout'
import { getDataAvailability } from '../search-view-helpers'
import { CategoryPortal } from './sidebar/category-portal'
import { RelatedKeywordsPanel } from './sidebar/related-keywords-panel'
import { StatusBar } from './status-bar'
import { StatsRow } from './stats-row'
import { AnalysisRow } from './analysis-row'
import { CertificationsCard } from './cards/certifications-card'

interface OverviewViewProps {
    products: ProductFinancial[]
    query: string
    job: ScrapeJob | null
    marketplace: string
    isJobActive: boolean
    isRefreshing: boolean
    totalResults: number | null
}

export function OverviewView({
    products, query, job, marketplace, isJobActive, isRefreshing, totalResults,
}: OverviewViewProps) {
    const stats = useMemo(() => computeOverviewStats(products), [products])
    const availability = useMemo(() => getDataAvailability(products), [products])

    return (
        <OverviewLayout>
            <OverviewSidebar>
                <RelatedKeywordsPanel query={query} />
                {availability.hasCategories && stats.top_categories.length > 0 && (
                    <CategoryPortal categories={stats.top_categories} />
                )}
                <CertificationsCard products={products} availability={availability} />
            </OverviewSidebar>
            <OverviewMain>
                <OverviewMainContent>
                    <StatusBar
                        job={job}
                        sampledCount={stats.total_products}
                        totalResults={totalResults}
                        isJobActive={isJobActive}
                        isRefreshing={isRefreshing}
                        availability={availability}
                    />
                    <StatsRow
                        stats={stats}
                        availability={availability}
                    />
                    <AnalysisRow
                        products={products}
                        stats={stats}
                        query={query}
                        marketplace={marketplace}
                        availability={availability}
                    />
                    {/* TODO: <PuckiInsightCard /> — coming soon */}
                </OverviewMainContent>
            </OverviewMain>
        </OverviewLayout>
    )
}
