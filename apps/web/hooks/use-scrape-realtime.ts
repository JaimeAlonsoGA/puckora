'use client'

/**
 * useScrapeRealtime
 *
 * Subscribes to Supabase Realtime `postgres_changes` for a single scrape_job
 * row and merges every UPDATE payload directly into the TanStack Query cache
 * (no re-fetch round-trip).
 *
 * Also seeds the cache from an `initialJob` value supplied by the Server
 * Component so there is zero loading flash on first render.
 *
 * The subscription is torn down automatically when `jobId` changes or the
 * component unmounts.
 *
 * @param jobId     – UUID of the job to watch, or null to skip.
 * @param initialJob – Server-pre-fetched snapshot; seeds the cache once on mount.
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/integrations/supabase/client'
import { scrapeKeys } from '@/queries/_keys'
import type { ScrapeJob } from '@puckora/types'

export function useScrapeRealtime(
    jobId: string | null,
    initialJob: ScrapeJob | null,
) {
    const queryClient = useQueryClient()

    // One-time cache seed from server-pre-fetched data
    useEffect(() => {
        if (jobId && initialJob) {
            queryClient.setQueryData(scrapeKeys.detail(jobId), initialJob)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId])

    // Realtime subscription
    useEffect(() => {
        if (!jobId) return

        const supabase = createClient()
        const channel = supabase
            .channel(`scrape_job:${jobId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'scrape_jobs',
                    filter: `id=eq.${jobId}`,
                },
                (payload) => {
                    queryClient.setQueryData(
                        scrapeKeys.detail(jobId),
                        payload.new as ScrapeJob,
                    )
                },
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [jobId, queryClient])
}
