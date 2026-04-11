'use client'

import { startTransition, useCallback, useEffect, useState } from 'react'
import type { Route } from 'next'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import type { ProductFinancial, ScrapeJob } from '@puckora/types'
import { MODULE_IDS } from '@/constants/app-state'
import {
    SEARCH_POLL_INTERVAL_MS,
    SEARCH_VIEW_IDS,
    type SearchViewId,
    isActiveSearchJobStatus,
} from '@/constants/search'
import { useSearchResultRepair } from '@/hooks/use-search-result-repair'
import { useAppStore } from '@/lib/store'
import { useSearchResearchGraph } from '@/hooks/use-search-research-graph'
import { useScrapeRealtime } from '@/hooks/use-scrape-realtime'
import { keywordResultsQueryOptions, scrapeJobQueryOptions } from '@/queries'
import { ENRICHMENT_TIMEOUT_MS } from './search-overview-helpers'

interface UseSearchViewStateParams {
    query: string
    initialView: SearchViewId
    initialProducts: ProductFinancial[]
    marketplace: string
    jobId: string | null
    initialJob: ScrapeJob | null
}

export function useSearchViewState({
    query,
    initialView,
    initialProducts,
    marketplace,
    jobId,
    initialJob,
}: UseSearchViewStateParams) {
    const [view, setView] = useState<SearchViewId>(initialView)
    const [enrichmentTimeoutCheckAt, setEnrichmentTimeoutCheckAt] = useState(() => Date.now())
    const [initialProductsUpdatedAt] = useState(() => (initialProducts.length > 0 ? Date.now() : 0))
    const router = useRouter()
    const pathname = usePathname()
    const setPuckiContext = useAppStore((state) => state.setPuckiContext)

    useScrapeRealtime(jobId, initialJob)

    const { data: job = initialJob } = useQuery({
        ...scrapeJobQueryOptions(jobId),
        initialData: initialJob,
    })

    const isJobActive = isActiveSearchJobStatus(job?.status)
    const enrichedAt = (job?.result as { enriched_at?: string } | null)?.enriched_at
    const completedAtMs = job?.completed_at ? new Date(job.completed_at).getTime() : null

    useEffect(() => {
        if (isJobActive || job?.status !== 'done' || enrichedAt || completedAtMs == null) return

        const deadlineMs = completedAtMs + ENRICHMENT_TIMEOUT_MS
        const remainingMs = deadlineMs - Date.now()
        if (remainingMs <= 0) return

        const timeoutId = window.setTimeout(() => setEnrichmentTimeoutCheckAt(Date.now()), remainingMs)

        return () => window.clearTimeout(timeoutId)
    }, [completedAtMs, enrichedAt, isJobActive, job?.status])

    const isEnrichmentExpired =
        completedAtMs != null && enrichmentTimeoutCheckAt - completedAtMs >= ENRICHMENT_TIMEOUT_MS

    const isEnriching =
        !isJobActive
        && job?.status === 'done'
        && !enrichedAt
        && !!job?.completed_at
        && !isEnrichmentExpired

    useSearchResearchGraph(query, isJobActive)

    const {
        data: products = [],
        refetch: refetchProducts,
    } = useQuery<ProductFinancial[]>({
        ...keywordResultsQueryOptions(query, marketplace),
        initialData: initialProducts,
        initialDataUpdatedAt: initialProductsUpdatedAt,
        refetchInterval: () => {
            if (isEnriching) return SEARCH_POLL_INTERVAL_MS.ENRICHMENT_RESULTS
            if (isRepairPolling && hasRepairableProducts) return SEARCH_POLL_INTERVAL_MS.ENRICHMENT_RESULTS
            return false
        },
        refetchIntervalInBackground: true,
        retry: false,
    })

    const { hasRepairableProducts, isRepairPolling } = useSearchResultRepair({
        enabled: !isJobActive && !isEnriching,
        keyword: query,
        marketplace,
        products,
    })

    useEffect(() => {
        if (!jobId || job?.status == null) return

        startTransition(() => {
            void refetchProducts()
        })
    }, [job?.completed_at, job?.error, job?.status, enrichedAt, jobId, refetchProducts])

    useEffect(() => {
        setPuckiContext({ currentQuery: query, currentAsin: undefined, currentModule: MODULE_IDS.SEARCH })
    }, [query, setPuckiContext])

    const showOverview = useCallback(() => {
        setView(SEARCH_VIEW_IDS.OVERVIEW)
        const href = (jobId ? `${pathname}?job=${jobId}` : pathname) as Route
        router.replace(href, { scroll: false })
    }, [jobId, pathname, router])

    return {
        job: job ?? null,
        isJobActive,
        isRefreshing: isEnriching || isRepairPolling,
        products,
        showOverview,
        view,
    }
}