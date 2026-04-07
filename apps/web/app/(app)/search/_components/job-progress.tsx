'use client'

import type { Route } from 'next'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { IconLoader2, IconX } from '@tabler/icons-react'
import { Alert, Button, Caption, NicheScoreCard, Stack, Subheading } from '@puckora/ui'
import { AppRoute, searchQueryRoute } from '@/constants/routes'
import type { ScrapeJob } from '@puckora/types'
import { SCRAPE_JOB_STATUS } from '@puckora/scraper-core'
import { parseAmazonSearchJobPayload, parseScrapeJobListings } from '@/schemas/scrape'
import { JobStatusBadge } from './_job-progress/job-status-badge'
import { ListingCard } from './_job-progress/listing-card'


interface JobProgressProps {
    job: ScrapeJob | null
}

export function JobProgress({ job }: JobProgressProps) {
    const t = useTranslations('search')
    const router = useRouter()
    const listings = parseScrapeJobListings(job?.result)

    // Auto-navigate to results page when the scrape job finishes.
    // The /search/[query] page uses loading.tsx skeletons so navigation
    useEffect(() => {
        if (job?.status !== SCRAPE_JOB_STATUS.DONE) return
        const keyword = parseAmazonSearchJobPayload(job?.payload)?.keyword ?? null
        if (!keyword) return
        router.push(searchQueryRoute(keyword) as Route)
        // router is stable; payload/keyword are immutable after job creation
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job?.status])

    const keyword = parseAmazonSearchJobPayload(job?.payload)?.keyword ?? null

    return (
        <Stack gap="6">
            {/* Inverted hero card — keyword + status */}
            <NicheScoreCard
                title={keyword ?? t('shell.jobInProgress')}
                subtitle={job ? undefined : undefined}
            >
                <div className="flex items-center justify-between py-2">
                    <Caption as="span" className="text-important-fg-2">{t('shell.jobInProgress')}</Caption>
                    {job && <JobStatusBadge status={job.status} />}
                </div>
                {job?.status === SCRAPE_JOB_STATUS.RUNNING && (
                    <div className="flex items-center gap-2 py-2">
                        <IconLoader2 size={14} aria-hidden="true" className="animate-spin text-important-fg-2" />
                        <Caption as="span" className="text-important-fg-2">{t('shell.jobScraping')}</Caption>
                    </div>
                )}
            </NicheScoreCard>

            {/* Error alert */}
            {job?.status === SCRAPE_JOB_STATUS.FAILED && job.error && (
                <Alert variant="error">{job.error}</Alert>
            )}

            {/* Listings grid */}
            {listings.length > 0 && (
                <Stack gap="3">
                    <Stack direction="row" align="center" gap="2">
                        <Subheading>{t('shell.results', { count: listings.length })}</Subheading>
                        <Caption className="text-muted-foreground">{t('shell.enrichmentHint')}</Caption>
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
                {t('shell.newSearch')}
            </Button>
        </Stack>
    )
}
