'use client'

import { useEffect, useState } from 'react'
import type { Route } from 'next'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { MODULE_IDS } from '@/constants/app-state'
import { useAppStore } from '@/lib/store'
import type { ProductFinancial, ScrapeJob } from '@puckora/types'
import { useSearchResearchGraph } from '@/hooks/use-search-research-graph'
import { useScrapeRealtime } from '@/hooks/use-scrape-realtime'
import { keywordResultsQueryOptions } from '@/queries'
import { scrapeJobQueryOptions } from '@/queries/scrape'
import { OverviewView } from './overview-view'
import { ProductsView } from './products-view'
import { ACTIVE_JOB_STATUSES } from './search-view-helpers'

interface SearchViewProps {
    query: string
    initialView: 'overview' | 'products'
    products: ProductFinancial[]
    marketplace: string
    jobId: string | null
    initialJob: ScrapeJob | null
}

export function SearchView({
    query,
    initialView,
    products: initialProducts,
    marketplace,
    jobId,
    initialJob,
}: SearchViewProps) {
    const [view, setView] = useState<'overview' | 'products'>(initialView)
    const [initialProductsUpdatedAt] = useState(() => (initialProducts.length > 0 ? Date.now() : 0))
    const router = useRouter()
    const pathname = usePathname()
    const { setPuckiContext } = useAppStore()

    useSearchResearchGraph(query)
    useScrapeRealtime(jobId, initialJob)

    const { data: job = initialJob } = useQuery({
        ...scrapeJobQueryOptions(jobId),
        initialData: initialJob,
    })

    const isJobActive = job ? ACTIVE_JOB_STATUSES.has(job.status) : false
    const baseQueryOptions = keywordResultsQueryOptions(query, marketplace)
    const { data: products = [] } = useQuery<ProductFinancial[]>({
        ...baseQueryOptions,
        initialData: initialProducts,
        initialDataUpdatedAt: initialProductsUpdatedAt,
        refetchInterval: () => (isJobActive ? 2_500 : false),
        retry: false,
    })

    useEffect(() => {
        setPuckiContext({ currentQuery: query, currentAsin: undefined, currentModule: MODULE_IDS.SEARCH })
    }, [query, setPuckiContext])

    function showProducts() {
        setView('products')
        const href = `${pathname}?view=products${jobId ? `&job=${jobId}` : ''}` as Route
        router.replace(href, { scroll: false })
    }

    function showOverview() {
        setView('overview')
        const href = (jobId ? `${pathname}?job=${jobId}` : pathname) as Route
        router.replace(href, { scroll: false })
    }

    return (
        <div className="flex h-full flex-col overflow-hidden">
            {view === 'overview' ? (
                <OverviewView
                    products={products}
                    query={query}
                    onSeeAll={showProducts}
                    job={job ?? null}
                    marketplace={marketplace}
                />
            ) : (
                <ProductsView products={products} query={query} onBack={showOverview} marketplace={marketplace} />
            )}
        </div>
    )
}