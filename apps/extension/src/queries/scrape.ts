/**
 * Scrape job queries — TanStack Query options for scrape job status.
 *
 * The popup uses these to display ongoing job progress.
 */
import { queryOptions } from '@tanstack/react-query'
import { scrapeKeys } from './_keys'
import { getSupabaseClient } from '@/integrations/supabase/client'
import type { ScrapeJob } from '@puckora/types'

async function fetchActiveJobs(): Promise<ScrapeJob[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('scrape_jobs')
        .select('*')
        .in('status', ['pending', 'running'])
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) throw new Error(error.message)
    return (data ?? []) as ScrapeJob[]
}

async function fetchScrapeJob(jobId: string): Promise<ScrapeJob | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

    if (error) return null
    return data as ScrapeJob
}

export const activeScrapeJobsQueryOptions = () =>
    queryOptions({
        queryKey: scrapeKeys.active(),
        queryFn: fetchActiveJobs,
        refetchInterval: 5_000, // poll every 5s in the popup
        staleTime: 0,
    })

export const scrapeJobQueryOptions = (jobId: string) =>
    queryOptions({
        queryKey: scrapeKeys.detail(jobId),
        queryFn: () => fetchScrapeJob(jobId),
        staleTime: 10_000,
    })
