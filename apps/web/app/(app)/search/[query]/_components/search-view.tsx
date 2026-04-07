'use client'

import { startTransition, useCallback, useEffect, useState } from 'react'
import type { Route } from 'next'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { MODULE_IDS } from '@/constants/app-state'
import { useAppStore } from '@/lib/store'
import type { ProductFinancial, ScrapeJob } from '@puckora/types'
import { useSearchResearchGraph } from '@/hooks/use-search-research-graph'
import { useScrapeRealtime } from '@/hooks/use-scrape-realtime'
import { keywordResultsQueryOptions, scrapeJobQueryOptions } from '@/queries'
import { OverviewView } from './overview/view'
import { ProductsView } from './products/view'
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
    const setPuckiContext = useAppStore((state) => state.setPuckiContext)

    useScrapeRealtime(jobId, initialJob)

    const { data: job = initialJob } = useQuery({
        ...scrapeJobQueryOptions(jobId),
        initialData: initialJob,
    })

    const isJobActive = job ? ACTIVE_JOB_STATUSES.has(job.status) : false

    useSearchResearchGraph(query, isJobActive)
    const baseQueryOptions = keywordResultsQueryOptions(query, marketplace)
    const {
        data: products = [],
        isFetching: isRefreshingProducts,
        refetch: refetchProducts,
    } = useQuery<ProductFinancial[]>({
        ...baseQueryOptions,
        initialData: initialProducts,
        initialDataUpdatedAt: initialProductsUpdatedAt,
        refetchInterval: () => (isJobActive ? 2_500 : false),
        refetchIntervalInBackground: true,
        retry: false,
    })

    useEffect(() => {
        if (!jobId || !job) return

        startTransition(() => {
            void refetchProducts()
        })
    }, [job?.completed_at, job?.error, job?.status, jobId, refetchProducts])

    useEffect(() => {
        setPuckiContext({ currentQuery: query, currentAsin: undefined, currentModule: MODULE_IDS.SEARCH })
    }, [query, setPuckiContext])

    const showProducts = useCallback(() => {
        setView('products')
        const href = `${pathname}?view=products${jobId ? `&job=${jobId}` : ''}` as Route
        router.replace(href, { scroll: false })
    }, [pathname, jobId, router])

    const showOverview = useCallback(() => {
        setView('overview')
        const href = (jobId ? `${pathname}?job=${jobId}` : pathname) as Route
        router.replace(href, { scroll: false })
    }, [pathname, jobId, router])

    return view === 'overview' ? (
        <OverviewView
            products={products}
            query={query}
            onSeeAll={showProducts}
            job={job ?? null}
            marketplace={marketplace}
            isJobActive={isJobActive}
            isRefreshing={isRefreshingProducts}
        />
    ) : (
        <ProductsView
            products={products}
            query={query}
            onBack={showOverview}
            marketplace={marketplace}
            isJobActive={isJobActive}
            isRefreshing={isRefreshingProducts}
        />
    )
}