'use client'

import { useTranslations } from 'next-intl'
import { Caption } from '@puckora/ui'
import { cn } from '@/lib/utils'

interface SearchQueryIndicatorProps {
    isJobActive: boolean
    isRefreshing: boolean
}

export function SearchQueryIndicator({ isJobActive, isRefreshing }: SearchQueryIndicatorProps) {
    const t = useTranslations('search')

    if (!isJobActive && !isRefreshing) return null

    const title = isRefreshing ? t('liveStatus.indicatorRefreshing') : t('liveStatus.indicatorActive')
    const hint = isRefreshing ? t('liveStatus.indicatorRefreshingHint') : t('liveStatus.indicatorActiveHint')

    return (
        <div className="inline-flex flex-wrap items-center gap-1.5 rounded-full border-hairline-default bg-card px-2.5 py-1">
            <span
                className={cn(
                    'size-2 rounded-full bg-primary motion-reduce:animate-none',
                    isRefreshing ? 'animate-pulse' : 'opacity-75',
                )}
                aria-hidden="true"
            />
            <Caption as="span" className="font-medium text-foreground">{title}</Caption>
            <Caption as="span">{hint}</Caption>
        </div>
    )
}