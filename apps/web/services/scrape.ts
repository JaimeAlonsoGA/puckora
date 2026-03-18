/**
 * Supabase service layer — scrape_jobs table.
 *
 * All functions accept a typed Supabase instance (server client or admin
 * client) so they work from both Server Actions and Route Handlers.
 *
 * Business logic lives in queries/ and server/. This file is pure DB I/O.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

import type { ScrapeJob, ScrapeJobInsert, ScrapeJobUpdate } from '@puckora/types'
import { SCRAPE_JOB_STATUS } from '@puckora/scraper-core'

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Insert a new scrape job for the given user.
 * Caller must supply a validated ScrapeJobInsert (payload already parsed).
 */
export async function createScrapeJob(
    supabase: SupabaseInstance,
    insert: ScrapeJobInsert,
): Promise<ScrapeJob> {
    const { data, error } = await supabase
        .from('scrape_jobs')
        .insert(insert)
        .select('*')
        .single()

    if (error) throw new Error(`createScrapeJob failed: ${error.message}`)
    return data as ScrapeJob
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Fetch a single job by ID.
 * Returns null when the row doesn't exist or the user doesn't own it (RLS).
 */
export async function getScrapeJob(
    supabase: SupabaseInstance,
    jobId: string,
): Promise<ScrapeJob | null> {
    const { data, error } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle()

    if (error) throw new Error(`getScrapeJob failed: ${error.message}`)
    return data as ScrapeJob | null
}

/**
 * List a user's pending jobs ordered by creation time (oldest first).
 * Used by the web app to show in-progress work.
 */
export async function listPendingScrapeJobs(
    supabase: SupabaseInstance,
    userId: string,
    limit = 20,
): Promise<ScrapeJob[]> {
    const { data, error } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('user_id', userId)
        .in('status', [SCRAPE_JOB_STATUS.PENDING, SCRAPE_JOB_STATUS.CLAIMED, SCRAPE_JOB_STATUS.RUNNING])
        .order('created_at', { ascending: true })
        .limit(limit)

    if (error) throw new Error(`listPendingScrapeJobs failed: ${error.message}`)
    return (data ?? []) as ScrapeJob[]
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Patch a job row. Used by the enrich endpoint to record results and update
 * status, and by the executor to claim a job (status → 'processing').
 */
export async function updateScrapeJob(
    supabase: SupabaseInstance,
    jobId: string,
    update: ScrapeJobUpdate,
): Promise<ScrapeJob> {
    const { data, error } = await supabase
        .from('scrape_jobs')
        .update(update)
        .eq('id', jobId)
        .select('*')
        .single()

    if (error) throw new Error(`updateScrapeJob failed: ${error.message}`)
    return data as ScrapeJob
}
