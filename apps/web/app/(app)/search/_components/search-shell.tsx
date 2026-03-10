'use client'

/**
 * SearchShell — client island for the /search page.
 *
 * Responsibilities:
 *   1. Gate: show extension install prompt when extension is not detected.
 *   2. Search view: render a form backed by createScrapeJobAction. On
 *      submission the server action creates a job and redirects to
 *      /search?job=<id>, which re-renders this shell with a jobId prop.
 *   3. Progress view: when a jobId is present, poll the job row via
 *      TanStack Query AND subscribe to Supabase Realtime for instant updates.
 *   4. Results view: once the job is done, render scraped listings.
 *
 * Server data handoff:
 *   - `initialJob` (pre-fetched by the Server Component) seeds the query
 *     cache so the shell renders initial state without a loading flicker.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IconSearch, IconLoader2, IconPlugConnected, IconX } from '@tabler/icons-react'
import { Surface, Stack, Alert, Button, Badge, Body, Caption, Subheading } from '@/components/building-blocks'
import { FormField, FormInput } from '@/components/form'
import { useFormAction } from '@/hooks/use-form-action'
import { useExtension } from '@/hooks/use-extension'
import { scrapeJobQueryOptions, scrapeKeys } from '@/queries'
import { createScrapeJobAction } from '@/app/(app)/actions'
import { AmazonSearchInputSchema } from '@/schemas/scrape'
import { createClient } from '@/integrations/supabase/client'
import { AppRoute } from '@/constants/routes'
import type { ScrapeJob } from '@/types/scrape'
import type { ScrapedListing } from '@puckora/scraper-core'
import { SCRAPE_JOB_STATUS } from '@puckora/scraper-core'

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
// Sub-components
// ---------------------------------------------------------------------------

/** Full-screen install prompt shown when the extension is not detected. */
function ExtensionGate() {
    return (
        <Surface variant="card" padding="lg" border="default">
            <Stack gap="4" align="center">
                <IconPlugConnected size={40} aria-hidden="true" className="text-[color:var(--text-muted)]" />
                <Subheading>Puckora Extension Required</Subheading>
                <Body className="text-center text-[color:var(--text-secondary)] max-w-sm">
                    The Amazon search feature runs directly from your browser via the Puckora
                    Chrome extension. Install it to get started.
                </Body>
                <Button
                    href="https://chrome.google.com/webstore"
                    variant="primary"
                >
                    Install Extension
                </Button>
            </Stack>
        </Surface>
    )
}

/** Spinner shown while the extension check is still running (~300 ms). */
function ExtensionChecking() {
    return (
        <Stack gap="2" align="center">
            <IconLoader2 size={20} aria-hidden="true" className="animate-spin text-[color:var(--text-muted)]" />
            <Caption>Checking for extension…</Caption>
        </Stack>
    )
}

/** Status badge for a scrape job. */
function JobStatusBadge({ status }: { status: ScrapeJob['status'] }) {
    const map: Partial<Record<ScrapeJob['status'], { variant: 'default' | 'info' | 'success' | 'error'; label: string }>> = {
        [SCRAPE_JOB_STATUS.PENDING]: { variant: 'default', label: 'Queued' },
        [SCRAPE_JOB_STATUS.CLAIMED]: { variant: 'info',    label: 'Claimed' },
        [SCRAPE_JOB_STATUS.RUNNING]: { variant: 'info',    label: 'Scraping…' },
        [SCRAPE_JOB_STATUS.DONE]:    { variant: 'success', label: 'Done' },
        [SCRAPE_JOB_STATUS.FAILED]:  { variant: 'error',   label: 'Failed' },
    }
    const { variant, label } = map[status] ?? { variant: 'default', label: status }
    return <Badge variant={variant}>{label}</Badge>
}

/** Compact card for a single scraped listing. */
function ListingCard({ listing }: { listing: ScrapedListing }) {
    return (
        <Surface variant="card" padding="sm" border="default">
            <Stack gap="2">
                <Body className="font-medium line-clamp-2">{listing.name ?? listing.asin}</Body>
                <Stack gap="3" direction="row">
                    <Caption>{listing.asin}</Caption>
                    {listing.price != null && (
                        <Caption className="text-[color:var(--text-secondary)]">
                            {typeof listing.price === 'number'
                                ? `$${listing.price.toFixed(2)}`
                                : String(listing.price)}
                        </Caption>
                    )}
                    {listing.rating != null && (
                        <Caption className="text-[color:var(--text-secondary)]">
                            ★ {listing.rating}
                        </Caption>
                    )}
                    {listing.review_count != null && (
                        <Caption className="text-[color:var(--text-muted)]">
                            ({listing.review_count.toLocaleString()})
                        </Caption>
                    )}
                </Stack>
            </Stack>
        </Surface>
    )
}

// ---------------------------------------------------------------------------
// Main shell
// ---------------------------------------------------------------------------

export function SearchShell({ userId, initialJobId, initialJob }: SearchShellProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { isInstalled, isChecking } = useExtension()

    // Seed query cache with server-pre-fetched data to avoid loading flash
    useEffect(() => {
        if (initialJobId && initialJob) {
            queryClient.setQueryData(scrapeKeys.detail(initialJobId), initialJob)
        }
    }, [initialJobId, initialJob, queryClient])

    // TanStack Query — polls while job is in-flight (safety net for Realtime)
    const { data: job } = useQuery(scrapeJobQueryOptions(initialJobId))

    // Supabase Realtime — instant updates without polling delay
    useEffect(() => {
        if (!initialJobId) return

        const supabase = createClient()
        const channel = supabase
            .channel(`scrape_job:${initialJobId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'scrape_jobs',
                    filter: `id=eq.${initialJobId}`,
                },
                (payload) => {
                    // Merge Realtime update into TanStack Query cache
                    queryClient.setQueryData(
                        scrapeKeys.detail(initialJobId),
                        payload.new as ScrapeJob,
                    )
                },
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [initialJobId, queryClient])

    // Search form (shown when no active job)
    const { form, onSubmit, serverError, isPending } = useFormAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        AmazonSearchInputSchema as any,
        createScrapeJobAction,
    )

    // ── Extension gate ──────────────────────────────────────────────────────
    if (isChecking) return <ExtensionChecking />
    if (!isInstalled) return <ExtensionGate />

    // ── Job progress / results ───────────────────────────────────────────────
    if (initialJobId) {
        const activeJob = job ?? initialJob
        const listings = (activeJob?.result?.listings ?? []) as ScrapedListing[]

        return (
            <Stack gap="6">
                {/* Job header */}
                <Surface variant="card" padding="md" border="default">
                    <Stack gap="2">
                        <Stack direction="row" align="center" gap="3">
                            <Subheading>Search in progress</Subheading>
                            {activeJob && <JobStatusBadge status={activeJob.status} />}
                        </Stack>
                        {activeJob?.status === SCRAPE_JOB_STATUS.RUNNING && (
                            <Stack direction="row" gap="2" align="center">
                                <IconLoader2
                                    size={16}
                                    aria-hidden="true"
                                    className="animate-spin text-[color:var(--text-muted)]"
                                />
                                <Caption>The extension is scraping the results page…</Caption>
                            </Stack>
                        )}
                        {activeJob?.status === SCRAPE_JOB_STATUS.FAILED && activeJob.error && (
                            <Alert variant="error">{activeJob.error}</Alert>
                        )}
                    </Stack>
                </Surface>

                {/* Listings grid */}
                {listings.length > 0 && (
                    <Stack gap="3">
                        <Stack direction="row" align="center" gap="2">
                            <Subheading>{listings.length} results</Subheading>
                            <Caption className="text-[color:var(--text-muted)]">
                                enrichment running in background
                            </Caption>
                        </Stack>
                        <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-3">
                            {listings.map((listing) => (
                                <ListingCard key={listing.asin} listing={listing} />
                            ))}
                        </div>
                    </Stack>
                )}

                {/* New search button */}
                <Button
                    variant="ghost"
                    onClick={() => router.push(AppRoute.search)}
                >
                    <IconX size={16} aria-hidden="true" />
                    New search
                </Button>
            </Stack>
        )
    }

    // ── Search form ──────────────────────────────────────────────────────────
    return (
        <Surface variant="card" padding="lg" border="default">
            <form onSubmit={onSubmit}>
                <Stack gap="4">
                    {serverError && (
                        <Alert variant="error">{serverError}</Alert>
                    )}

                    <FormField
                        label="Search term"
                        error={form.formState.errors.keyword?.message}
                    >
                        <FormInput
                            {...form.register('keyword')}
                            placeholder="e.g. wireless earbuds"
                            type="search"
                            autoFocus
                        />
                    </FormField>

                    <Button
                        type="submit"
                        variant="primary"
                        loading={isPending}
                        fullWidth
                    >
                        <IconSearch size={16} aria-hidden="true" />
                        Search Amazon
                    </Button>
                </Stack>
            </form>
        </Surface>
    )
}
