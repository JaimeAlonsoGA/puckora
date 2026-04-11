'use client'

import { useTranslations } from 'next-intl'
import type { Route } from 'next'
import { Body, Button, Subheading } from '@puckora/ui'
import { AppRoute, searchQueryRoute } from '@/constants/routes'

interface ProductNotFoundProps { asin: string; query: string | null }

export function ProductNotFound({ asin, query }: ProductNotFoundProps) {
    const t = useTranslations('product')
    const backRoute = (query ? searchQueryRoute(query) : AppRoute.search) as Route
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <Subheading>{t('notFound.title')}</Subheading>
            <Body className="text-muted-foreground text-center max-w-sm">
                {t('notFound.body', { asin })}
            </Body>
            <Button href={backRoute} variant="secondary" size="sm">
                {t('nav.backToResults')}
            </Button>
        </div>
    )
}
