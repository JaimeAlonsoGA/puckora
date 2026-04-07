'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@puckora/ui'
import { SCRAPE_JOB_STATUS } from '@puckora/scraper-core'
import type { ScrapeJob } from '@puckora/types'

type BadgeVariant = 'default' | 'info' | 'success' | 'error'

const STATUS_MAP: Partial<Record<ScrapeJob['status'], { variant: BadgeVariant; labelKey: string }>> = {
    [SCRAPE_JOB_STATUS.PENDING]: { variant: 'default', labelKey: 'jobStatus.queued' },
    [SCRAPE_JOB_STATUS.CLAIMED]: { variant: 'info', labelKey: 'jobStatus.claimed' },
    [SCRAPE_JOB_STATUS.RUNNING]: { variant: 'info', labelKey: 'jobStatus.running' },
    [SCRAPE_JOB_STATUS.DONE]: { variant: 'success', labelKey: 'jobStatus.done' },
    [SCRAPE_JOB_STATUS.FAILED]: { variant: 'error', labelKey: 'jobStatus.failed' },
}

export function JobStatusBadge({ status }: { status: ScrapeJob['status'] }) {
    const t = useTranslations('search')
    const cfg = STATUS_MAP[status]
    return (
        <Badge variant={cfg?.variant ?? 'default'}>
            {cfg ? t(cfg.labelKey as Parameters<typeof t>[0]) : status}
        </Badge>
    )
}
