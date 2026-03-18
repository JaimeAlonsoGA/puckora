'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { IconLoader2, IconX } from '@tabler/icons-react'
import { Surface, Stack, Alert, Button, Badge, Subheading, Body, Caption } from '@puckora/ui'
import { AppRoute } from '@/constants/routes'
import type { ScrapeJob } from '@puckora/types'
import type { ScrapedListing } from '@puckora/scraper-core'
import { SCRAPE_JOB_STATUS } from '@puckora/scraper-core'

// ---------------------------------------------------------------------------
// JobStatusBadge — pure display
// ---------------------------------------------------------------------------

type BadgeVariant = 'default' | 'info' | 'success' | 'error'

const STATUS_MAP: Partial<Record<ScrapeJob['status'], { variant: BadgeVariant; labelKey: string }>> = {
    [SCRAPE_JOB_STATUS.PENDING]: { variant: 'default', labelKey: 'jobStatusQueued' },
    [SCRAPE_JOB_STATUS.CLAIMED]: { variant: 'info', labelKey: 'jobStatusClaimed' },
    [SCRAPE_JOB_STATUS.RUNNING]: { variant: 'info', labelKey: 'jobStatusScraping' },
    [SCRAPE_JOB_STATUS.DONE]: { variant: 'success', labelKey: 'jobStatusDone' },
    [SCRAPE_JOB_STATUS.FAILED]: { variant: 'error', labelKey: 'jobStatusFailed' },
}

function JobStatusBadge({ status }: { status: ScrapeJob['status'] }) {
    const t = useTranslations('search')
    const cfg = STATUS_MAP[status]
    // Fall back to raw status string if unmapped
    return (
        <Badge variant={cfg?.variant ?? 'default'}>
            {cfg ? t(cfg.labelKey as Parameters<typeof t>[0]) : status}
        </Badge>
    )
}

// ---------------------------------------------------------------------------
// ListingCard — pure display
// ---------------------------------------------------------------------------

function ListingCard({ listing }: { listing: ScrapedListing }) {
    const price =
        listing.price != null
            ? typeof listing.price === 'number'
                ? `$${listing.price.toFixed(2)}`
                : String(listing.price)
            : null

    return (
        <Surface variant="card" padding="sm" border="default">
            <Stack gap="2">
                <Body className="line-clamp-2 font-medium">{listing.name ?? listing.asin}</Body>
                <Stack direction="row" gap="3">
                    <Caption>{listing.asin}</Caption>
                    {price && <Caption className="text-muted-foreground">{price}</Caption>}
                    {listing.rating != null && (
                        <Caption className="text-muted-foreground">★ {listing.rating}</Caption>
                    )}
                    {listing.review_count != null && (
                        <Caption className="text-faint">({listing.review_count.toLocaleString()})</Caption>
                    )}
                </Stack>
            </Stack>
        </Surface>
    )
}

// ---------------------------------------------------------------------------
// JobProgress
// ---------------------------------------------------------------------------

interface JobProgressProps {
    job: ScrapeJob | null
}

export function JobProgress({ job }: JobProgressProps) {
    const t = useTranslations('search')
    const router = useRouter()
    const rawResult = job?.result as unknown
    const listings = Array.isArray(rawResult)
        ? rawResult as ScrapedListing[]
        : Array.isArray((rawResult as { listings?: unknown[] } | null | undefined)?.listings)
            ? ((rawResult as { listings?: unknown[] }).listings as ScrapedListing[])
            : []

    // Auto-navigate to results page when the scrape job finishes.
    // The /search/[query] page uses loading.tsx skeletons so navigation
    // feels instant while SSR data loads server-side.
    useEffect(() => {
        if (job?.status !== SCRAPE_JOB_STATUS.DONE) return
        const payload = job.payload as Record<string, unknown> | null | undefined
        const keyword = typeof payload?.keyword === 'string' ? payload.keyword : null
        if (!keyword) return
        router.push(`/search/${encodeURIComponent(keyword)}`)
        // router is stable; payload/keyword are immutable after job creation
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job?.status])

    return (
        <Stack gap="6">
            {/* Job status header */}
            <Surface variant="card" padding="md" border="default">
                <Stack gap="2">
                    <Stack direction="row" align="center" gap="3">
                        <Subheading>{t('shellJobInProgress')}</Subheading>
                        {job && <JobStatusBadge status={job.status} />}
                    </Stack>

                    {job?.status === SCRAPE_JOB_STATUS.RUNNING && (
                        <Stack direction="row" gap="2" align="center">
                            <IconLoader2 size={16} aria-hidden="true" className="animate-spin text-muted-foreground" />
                            <Caption>{t('shellJobScraping')}</Caption>
                        </Stack>
                    )}

                    {job?.status === SCRAPE_JOB_STATUS.FAILED && job.error && (
                        <Alert variant="error">{job.error}</Alert>
                    )}
                </Stack>
            </Surface>

            {/* Listings grid */}
            {listings.length > 0 && (
                <Stack gap="3">
                    <Stack direction="row" align="center" gap="2">
                        <Subheading>{t('shellResults', { count: listings.length })}</Subheading>
                        <Caption className="text-muted-foreground">{t('shellEnrichmentHint')}</Caption>
                    </Stack>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {listings.map((listing) => (
                            <ListingCard key={listing.asin} listing={listing} />
                        ))}
                    </div>
                </Stack>
            )}

            <Button variant="ghost" onClick={() => router.push(AppRoute.search)}>
                <IconX size={16} aria-hidden="true" />
                {t('shellNewSearch')}
            </Button>
        </Stack>
    )
}
