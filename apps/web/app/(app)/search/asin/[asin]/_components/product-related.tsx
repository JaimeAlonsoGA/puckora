'use client'

import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { DataCard } from '@puckora/ui'
import { Body, Caption } from '@puckora/ui'
import { Badge } from '@puckora/ui'
import { searchAsinRoute } from '@/constants/routes'
import { similarProductsQueryOptions } from '@/queries'
import Link from 'next/link'

interface RelatedProductsProps {
    asin: string
}

export function RelatedProducts({ asin }: RelatedProductsProps) {
    const t = useTranslations('product')
    const { data: results, isPending } = useQuery(similarProductsQueryOptions(asin))

    return (
        <DataCard title={t('related.title')}>
            {isPending && (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
                    ))}
                </div>
            )}
            {!isPending && (!results || results.length === 0) && (
                <Caption className="text-muted-foreground">{t('related.empty')}</Caption>
            )}
            {!isPending && results && results.length > 0 && (
                <div className="flex flex-col gap-1">
                    {results.map((row) => (
                        <Link
                            key={row.asin}
                            href={searchAsinRoute(row.asin)}
                            className="group flex items-start justify-between gap-2 rounded-md px-2 py-2 hover:bg-muted transition-colors"
                        >
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <Body className="truncate text-sm leading-tight group-hover:text-foreground">
                                    {row.title ?? row.asin}
                                </Body>
                                {row.brand && (
                                    <Caption className="text-muted-foreground truncate text-xs">
                                        {row.brand}
                                    </Caption>
                                )}
                            </div>
                            <Badge variant="default" size="sm" className="shrink-0 tabular-nums">
                                {Math.round(row.score * 100)}%
                            </Badge>
                        </Link>
                    ))}
                </div>
            )}
        </DataCard>
    )
}
