'use client'

import { useTranslations } from 'next-intl'
import { Alert } from '@puckora/ui'
import { SCRAPE_JOB_STATUS } from '@puckora/scraper-core'
import type { ScrapeJob } from '@puckora/types'
import type { SearchDataAvailability } from '@/types/search'

interface SearchLiveStatusProps {
    job: ScrapeJob | null
    availability: SearchDataAvailability
}

export function SearchLiveStatus({ job, availability }: SearchLiveStatusProps) {
    const t = useTranslations('search')

    if (!job) return null

    // Suppress informational alerts while the scraper is running — the products
    // view (with skeleton rows) communicates progress visually.
    // Only surface actionable states: failed job or partial data warning.

    if (job.status === SCRAPE_JOB_STATUS.FAILED) {
        return (
            <Alert variant={availability.hasListings ? 'warning' : 'error'} title={t('liveStatus.failedTitle')}>
                {availability.hasListings ? t('liveStatus.failedBody') : t('liveStatus.unavailableBody')}
            </Alert>
        )
    }

    if (job.error && availability.hasListings && !availability.hasFinancials) {
        return (
            <Alert variant="warning" title={t('liveStatus.unavailableTitle')}>
                {t('liveStatus.unavailableBody')}
            </Alert>
        )
    }

    return null
}