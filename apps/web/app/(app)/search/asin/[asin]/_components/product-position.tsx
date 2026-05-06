'use client'

import { useTranslations } from 'next-intl'
import { DataCard, Caption, Mono } from '@puckora/ui'
import { formatCount, formatCompactMoney, formatRank, formatRating } from '@puckora/utils'
import type { ProductFinancial } from '@puckora/types'

interface ProductPositionProps {
    product: ProductFinancial
}

function PositionRow({
    label,
    value,
}: {
    label: string
    value: string | null | undefined
}) {
    if (value == null) return null
    return (
        <div className="flex items-center justify-between gap-2 py-1">
            <Caption className="text-muted-foreground">{label}</Caption>
            <Mono className="text-sm">{value}</Mono>
        </div>
    )
}

export function ProductPosition({ product }: ProductPositionProps) {
    const t = useTranslations('product')

    return (
        <DataCard title={t('position.title')}>
            <PositionRow
                label={t('position.bsrRank')}
                value={product.rank != null ? formatRank(product.rank) : null}
            />
            <PositionRow label={t('position.category')} value={product.category_path} />
            <PositionRow
                label={t('position.dailyVelocity')}
                value={
                    product.daily_velocity != null
                        ? t('position.velocityUnits', {
                            count: formatCount(product.daily_velocity),
                        })
                        : null
                }
            />
            <PositionRow
                label={t('position.monthlyRevenue')}
                value={
                    product.monthly_revenue != null
                        ? formatCompactMoney(product.monthly_revenue)
                        : null
                }
            />
            {product.bought_past_month != null && (
                <PositionRow
                    label={t('position.bought')}
                    value={formatCount(product.bought_past_month)}
                />
            )}
            <PositionRow
                label={t('position.rating')}
                value={product.rating != null ? formatRating(product.rating) : null}
            />
            <PositionRow
                label={t('position.reviewCount')}
                value={product.review_count != null ? formatCount(product.review_count) : null}
            />
            {product.product_age_months != null && (
                <PositionRow
                    label={t('logistics.listingAge')}
                    value={t('logistics.listingAgeMonthsLong', {
                        months: product.product_age_months,
                    })}
                />
            )}
        </DataCard>
    )
}
