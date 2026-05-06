'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Heading, Body, Caption, Mono, Badge } from '@puckora/ui'
import { formatCount, formatRating } from '@puckora/utils'
import { useAppStore } from '@/lib/store'
import { MARK_STATE_BADGE_VARIANTS } from '@/constants/app-state'
import type { ProductFinancial } from '@puckora/types'

interface ProductHeaderProps {
    product: ProductFinancial
}

export function ProductHeader({ product }: ProductHeaderProps) {
    const t = useTranslations('product')
    const asin = product.asin ?? ''
    // Per-item store selector — only re-renders when THIS product's mark state changes
    const markState = useAppStore((s) => s.markedProducts?.[asin]?.markState ?? null)

    return (
        <div className="flex gap-4">
            {product.main_image_url ? (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border-hairline">
                    <Image
                        src={product.main_image_url}
                        alt={t('header.imageAlt')}
                        fill
                        className="object-contain p-1"
                        sizes="96px"
                        unoptimized
                    />
                </div>
            ) : (
                <div className="h-24 w-24 shrink-0 rounded-md bg-muted border-hairline" />
            )}
            <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-start gap-2">
                    <Heading as="h1" className="text-xl leading-tight">
                        {product.title ?? t('header.untitled')}
                    </Heading>
                    {markState && (
                        <Badge
                            variant={MARK_STATE_BADGE_VARIANTS[markState]}
                            size="sm"
                            className="mt-0.5 shrink-0"
                        >
                            {markState}
                        </Badge>
                    )}
                </div>
                {product.brand && (
                    <Body className="text-muted-foreground text-sm">{product.brand}</Body>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Mono className="text-xs text-muted-foreground">{asin}</Mono>
                    {product.rating != null && product.review_count != null && (
                        <Caption className="text-xs text-muted-foreground">
                            ★ {formatRating(product.rating)}{' '}
                            {t('header.reviewCount', { count: formatCount(product.review_count) })}
                        </Caption>
                    )}
                    {product.category_path && (
                        <Caption className="max-w-xs truncate text-xs text-muted-foreground">
                            {product.category_path}
                        </Caption>
                    )}
                </div>
            </div>
        </div>
    )
}
