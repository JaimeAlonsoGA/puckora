'use client'

/**
 * Query domain — discover products.
 *
 * Strategy:
 * 1. The server SSR-fetches the initial product list (stable for this session).
 * 2. The client locks that list in useState — the order never oscillates.
 * 3. A lightweight poll hits /api/discover/bpm-refresh with the specific ASINs
 *    that are missing bought_past_month. As the background BPM repair writes to
 *    DB, each poll merges fresh values into the stable product list.
 * 4. When all ASINs have BPM (or after a generous timeout), polling stops.
 *
 * Why NOT re-poll /api/discover:
 * - fallback_arm has no ORDER BY → random sample on each call → oscillating rows.
 * - Repaired products move from fallback_arm to bpm_arm but may fall outside the
 *   LIMIT cut there, so the updated values are never surfaced by the full query.
 */

import { queryOptions, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { ProductFinancial } from '@puckora/types'
import { QUERY_ERROR_MESSAGES } from '@/constants/api'
import { fetchJson } from './fetch'
import { discoverKeys } from './_keys'

// Poll every 5 s while BPM data is missing.
const DISCOVER_BPM_POLL_INTERVAL_MS = 5_000
// Stop polling after ~3 minutes (BPM may simply not exist for some products).
const DISCOVER_BPM_MAX_POLLS = 36

// ---------------------------------------------------------------------------
// BPM-refresh query options
// ---------------------------------------------------------------------------

export const discoverBpmRefreshQueryOptions = (asins: string[]) =>
    queryOptions<Record<string, number | null>>({
        queryKey: discoverKeys.bpmRefresh(asins),
        queryFn: () => {
            const params = new URLSearchParams({ asins: asins.join(',') })
            return fetchJson<Record<string, number | null>>(
                `/api/discover/bpm-refresh?${params}`,
                undefined,
                QUERY_ERROR_MESSAGES.DISCOVER_RESULTS_FETCH_FAILED,
            )
        },
        enabled: asins.length > 0,
        staleTime: 0,
        refetchInterval: (query) => {
            // Stop if we never get data back (server error) after a few attempts.
            if (!query.state.data) return DISCOVER_BPM_POLL_INTERVAL_MS
            // Stop after the timeout ceiling.
            if (query.state.dataUpdateCount >= DISCOVER_BPM_MAX_POLLS) return false
            // Stop when every ASIN has a BPM value.
            const allFilled = asins.every((asin) => query.state.data![asin] != null)
            return allFilled ? false : DISCOVER_BPM_POLL_INTERVAL_MS
        },
    })

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a stable, progressively-updated product list.
 *
 * - Product order is fixed from `initialProducts` (SSR) — no oscillation.
 * - `bought_past_month` fills in as the background BPM repair completes.
 */
export function useDiscoverProducts(initialProducts: ProductFinancial[]): ProductFinancial[] {
    const [products, setProducts] = useState(initialProducts)

    // Compute the missing-BPM ASIN list once at mount from the stable initial data.
    // useRef ensures this never changes across re-renders within a page session.
    const missingBpmAsins = useRef(
        initialProducts
            .filter((p) => p.bought_past_month == null && p.asin != null)
            .map((p) => p.asin as string),
    ).current

    const { data: bpmMap } = useQuery(discoverBpmRefreshQueryOptions(missingBpmAsins))

    // Merge fresh BPM values into the stable product list whenever the poll succeeds.
    useEffect(() => {
        if (!bpmMap) return
        setProducts((prev) =>
            prev.map((p) => {
                if (p.asin == null || p.bought_past_month != null) return p
                const fresh = bpmMap[p.asin]
                if (fresh == null) return p
                return { ...p, bought_past_month: fresh }
            }),
        )
    }, [bpmMap])

    return products
}
