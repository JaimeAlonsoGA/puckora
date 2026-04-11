'use client'

import type { ProductFinancial, ScrapeJob } from '@puckora/types'
import { OverviewView } from './overview/view'
import { useSearchOverviewState } from './search-overview-state'

interface SearchOverviewShellProps {
    query: string
    products: ProductFinancial[]
    marketplace: string
    jobId: string | null
    initialJob: ScrapeJob | null
    totalResults: number | null
}

export function SearchOverviewShell({
    query,
    products: initialProducts,
    marketplace,
    jobId,
    initialJob,
    totalResults,
}: SearchOverviewShellProps) {
    const { job, isJobActive, isRefreshing, products } = useSearchOverviewState({
        query,
        initialProducts,
        marketplace,
        jobId,
        initialJob,
    })

    return (
        <OverviewView
            products={products}
            query={query}
            job={job}
            isJobActive={isJobActive}
            isRefreshing={isRefreshing}
            totalResults={totalResults}
        />
    )
}