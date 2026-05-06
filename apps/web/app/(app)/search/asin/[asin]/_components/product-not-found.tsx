'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@puckora/ui'
import { Heading, Body } from '@puckora/ui'
import { AppRoute } from '@/constants/routes'

interface ProductNotFoundProps {
    asin: string
    query: string | null
}

export function ProductNotFound({ asin, query }: ProductNotFoundProps) {
    const t = useTranslations('product')

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
            <div className="flex flex-col items-center gap-2 text-center">
                <Heading>{t('notFound.title')}</Heading>
                <Body className="text-muted-foreground max-w-sm">
                    {t('notFound.body', { asin })}
                </Body>
            </div>
            {query ? (
                <Button href={`${AppRoute.searchKeyword}/${query}`} variant="secondary">
                    {t('nav.backTo', { keyword: query })}
                </Button>
            ) : (
                <Button href={AppRoute.search} variant="secondary">
                    {t('nav.backToResults')}
                </Button>
            )}
        </div>
    )
}
