'use client'

import { useTranslations } from 'next-intl'
import { Alert } from '@puckora/ui'
import { SCRAPE_JOB_STATUS } from '@puckora/scraper-core'
import type { ScrapeJob } from '@puckora/types'
import { ACTIVE_JOB_STATUSES } from './search-view-helpers'
import type { SearchDataAvailability } from '@/types/search'

interface SearchLiveStatusProps {
    job: ScrapeJob | null
    availability: SearchDataAvailability
}

export function SearchLiveStatus({ job, availability }: SearchLiveStatusProps) {
    const t = useTranslations('search')

    if (!job) return null

    const isRunning = ACTIVE_JOB_STATUSES.has(job.status)

    if (isRunning && !availability.hasListings) {
        return (
            <Alert variant="info" title={t('liveStatus.collectingTitle')}>
                {t('liveStatus.collectingBody')}
            </Alert>
        )
    }

    if (isRunning && availability.hasListings && !availability.hasFinancials) {
        return (
            <Alert variant="info" title={t('liveStatus.partialTitle')}>
                {t('liveStatus.partialBody')}
            </Alert>
        )
    }

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