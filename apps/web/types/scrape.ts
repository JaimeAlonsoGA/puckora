/**
 * App-local types for the scrape_jobs table.
 *
 * Kept here until @puckora/types gains generated DB types for this table.
 * The payload/result fields are typed as Record<string, unknown> at the DB
 * boundary; use ScrapeJobPayloadSchema / ScrapeResultSchema from
 * @puckora/scraper-core to validate them after reading from DB.
 */

import type { ScrapeJobPayload, ScrapeResult, ScrapeJobStatus } from '@puckora/scraper-core'

// ---------------------------------------------------------------------------
// Status — re-exported for consumers that import from @/types/scrape
// ---------------------------------------------------------------------------

export type { ScrapeJobStatus }

// ---------------------------------------------------------------------------
// Row shape
// ---------------------------------------------------------------------------

export interface ScrapeJob {
    id: string
    user_id: string
    /** Discriminated type — matches ScrapeJobPayload.type */
    type: string
    status: ScrapeJobStatus
    /** Validated against ScrapeJobPayloadSchema from @puckora/scraper-core */
    payload: ScrapeJobPayload
    /** Populated by the enrich endpoint; null until job is done */
    result: ScrapeResult | null
    error: string | null
    /** 'extension' | 'agent' | null */
    executor: string | null
    claimed_at: string | null
    completed_at: string | null
    created_at: string
}

export type ScrapeJobInsert = Pick<ScrapeJob, 'user_id' | 'type' | 'payload' | 'status'>

export type ScrapeJobUpdate = Partial<
    Pick<ScrapeJob, 'status' | 'result' | 'error' | 'executor' | 'claimed_at' | 'completed_at'>
>
