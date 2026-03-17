'use client'

/**
 * SearchShell — client orchestrator for the /search page.
 *
 * Responsibilities (routing only — no UI, no inline strings):
 *   1. Read extension install state.
 *   2. Subscribe to Realtime + seed TanStack cache via useScrapeRealtime.
 *   3. Route to the correct view: ExtensionChecking → ExtensionGate →
 *      JobProgress (when a job is active) → SearchForm.
 *
 * All UI, i18n, and data concerns live in the dedicated sub-components.
 */

import { useQuery } from '@tanstack/react-query'
import { useExtension } from '@/hooks/use-extension'
import { useScrapeRealtime } from '@/hooks/use-scrape-realtime'
import { scrapeJobQueryOptions } from '@/queries'
import { ExtensionChecking, ExtensionGate } from './extension-gate'
import { JobProgress } from './job-progress'
import { SearchForm } from './search-form'
import type { ScrapeJob } from '@puckora/types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SearchShellProps {
    userId: string
    /** Set when the URL contains ?job=<uuid> (post-redirect from server action) */
    initialJobId: string | null
    /** Pre-fetched by the Server Component to avoid a loading flash */
    initialJob: ScrapeJob | null
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function SearchShell({ userId: _userId, initialJobId, initialJob }: SearchShellProps) {
    const { isInstalled, isChecking } = useExtension()

    // Seed cache + subscribe to Realtime for the active job
    useScrapeRealtime(initialJobId, initialJob)

    // Poll as a safety-net alongside Realtime
    const { data: job } = useQuery(scrapeJobQueryOptions(initialJobId))

    // ── Extension gate ──────────────────────────────────────────────────────
    if (isChecking) return <ExtensionChecking />
    if (!isInstalled) return <ExtensionGate />

    // ── Active job ──────────────────────────────────────────────────────────
    if (initialJobId) return <JobProgress job={job ?? initialJob} />

    // ── Idle: show search form ───────────────────────────────────────────────
    return <SearchForm />
}
