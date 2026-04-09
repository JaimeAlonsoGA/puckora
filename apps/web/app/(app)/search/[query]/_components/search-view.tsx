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
import { ACTIVE_JOB_STATUSES, ENRICHMENT_TIMEOUT_MS } from './search-view-helpers'

interface SearchViewProps {
    query: string
    initialView: 'overview' | 'products'
    products: ProductFinancial[]
    marketplace: string
    jobId: string | null
    initialJob: ScrapeJob | null
    totalResults: number | null
}

export function SearchView({
    query,
    initialView,
    products: initialProducts,
    marketplace,
    jobId,
    initialJob,
    totalResults,
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
    const enrichedAt = (job?.result as { enriched_at?: string } | null)?.enriched_at
    // Keep polling until SP-API enrichment sets enriched_at. Fall back to a
    // time-bounded stop (ENRICHMENT_TIMEOUT_MS) so that a silent after() failure
    // (e.g. missing SP-API creds in dev) cannot cause infinite polling.
    const isEnriching =
        !isJobActive
        && job?.status === 'done'
        && !enrichedAt
        && !!job?.completed_at
        && Date.now() - new Date(job.completed_at).getTime() < ENRICHMENT_TIMEOUT_MS

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
        refetchInterval: () => {
            // Products are written at ENRICH_DONE (same moment as JOB_DONE).
            // Polling during active job always returns [] and hammers the view
            // under write load. The useEffect on job.status fires the single
            // targeted fetch after the job completes.
            if (isEnriching) return 5_000   // slow: waiting for SP-API financials
            return false
        },
        refetchIntervalInBackground: true,
        retry: false,
    })

    useEffect(() => {
        if (!jobId || !job) return

        startTransition(() => {
            void refetchProducts()
        })
    }, [job?.completed_at, job?.error, job?.status, enrichedAt, jobId, refetchProducts])

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

    // Show the refresh indicator while the scraper is ACTIVELY running.
    // Keeping it tied to isJobActive (not gated by isRefreshingProducts) ensures
    // the user always knows a scan is in progress, even between poll windows.
    const isVisiblyRefreshing = isJobActive

    return view === 'overview' ? (
        <OverviewView
            products={products}
            query={query}
            job={job ?? null}
            marketplace={marketplace}
            isJobActive={isJobActive}
            isRefreshing={isVisiblyRefreshing}
            totalResults={totalResults}
        />
    ) : (
        <ProductsView
            products={products}
            query={query}
            onBack={showOverview}
            marketplace={marketplace}
            isJobActive={isJobActive}
            isRefreshing={isVisiblyRefreshing}
        />
    )
}