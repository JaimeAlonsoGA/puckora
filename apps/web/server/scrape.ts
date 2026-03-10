/**
 * Server-side React.cache wrappers for scrape_jobs.
 *
 * Deduplicates identical fetches within a single React render tree.
 * Import only from Server Components or Server Actions.
 */
import 'server-only'

import { cache } from 'react'
import { createServerClient } from '@/integrations/supabase/server'
import { getScrapeJob, listPendingScrapeJobs } from '@/services/scrape'
import type { ScrapeJob } from '@/types/scrape'

/**
 * Fetch a single scrape job by ID. Deduplicated per request.
 */
export const getCachedScrapeJob = cache(async (jobId: string): Promise<ScrapeJob | null> => {
    const supabase = await createServerClient()
    return getScrapeJob(supabase, jobId)
})

/**
 * List pending/processing jobs for a user. Not deduplicated (always fresh).
 */
export async function getActiveScrapeJobs(userId: string): Promise<ScrapeJob[]> {
    const supabase = await createServerClient()
    return listPendingScrapeJobs(supabase, userId)
}
