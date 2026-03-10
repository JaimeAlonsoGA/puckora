'use client'

/**
 * TanStack Query definitions for scrape_jobs.
 *
 * Job creation flows through a Server Action + useFormAction (see actions.ts).
 * This file provides query options for reading job state and an invalidation
 * helper to bust the cache after a server action completes.
 */

import { queryOptions, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/integrations/supabase/client'
import { scrapeKeys } from './_keys'
import type { ScrapeJob } from '@/types/scrape'
import { SCRAPE_JOB_STATUS } from '@puckora/scraper-core'

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

/**
 * Fetch a single scrape job by ID using the Supabase browser client.
 * RLS ensures users can only read their own jobs.
 *
 * Pass jobId=null to produce a disabled query (enabled: false).
 */
export const scrapeJobQueryOptions = (jobId: string | null) =>
    queryOptions({
        queryKey: scrapeKeys.detail(jobId ?? ''),
        queryFn: async (): Promise<ScrapeJob | null> => {
            if (!jobId) return null
            const supabase = createClient()
            const { data, error } = await supabase
                .from('scrape_jobs')
                .select('*')
                .eq('id', jobId)
                .maybeSingle()
            if (error) throw new Error(`scrapeJobQueryOptions: ${error.message}`)
            return data as ScrapeJob | null
        },
        enabled: !!jobId,
        // Jobs finish quickly — poll every 3s while in-flight.
        // The search shell also uses Realtime, so this is just a safety net.
        refetchInterval: (query) => {
            const status = query.state.data?.status
            return status === SCRAPE_JOB_STATUS.PENDING || status === SCRAPE_JOB_STATUS.CLAIMED || status === SCRAPE_JOB_STATUS.RUNNING ? 3_000 : false
        },
        staleTime: 0,
    })

// ---------------------------------------------------------------------------
// Invalidation helper
// ---------------------------------------------------------------------------

/**
 * Returns a function that invalidates all scrape job queries.
 * Call from useFormAction's onSuccess or after a Realtime event.
 */
export function useInvalidateScrapeJob() {
    const queryClient = useQueryClient()
    return (jobId?: string) => {
        if (jobId) {
            return queryClient.invalidateQueries({ queryKey: scrapeKeys.detail(jobId) })
        }
        return queryClient.invalidateQueries({ queryKey: scrapeKeys.all })
    }
}
