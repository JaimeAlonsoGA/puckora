'use client'

import { useTranslations } from 'next-intl'
import { KpiCard } from '@puckora/ui'
import { AnimatedMonoNumber } from '@/components/shared/animated-numbers'
import {
    formatMoney,
    formatCompactMoney,
    formatCount,
    formatRating,
    cn,
} from '@puckora/utils'
import type { ProductFinancial } from '@puckora/types'

interface ProductKpisProps {
    product: ProductFinancial
}

export function ProductKpis({ product }: ProductKpisProps) {
    const t = useTranslations('product')
    const isPendingEnrichment = product.monthly_revenue == null || product.bought_past_month == null
    const netPositive = product.net_per_unit != null && product.net_per_unit > 0

    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <KpiCard
                label={t('hero.price')}
                value={<AnimatedMonoNumber value={product.price} formatter={formatMoney} />}
            />
            <KpiCard
                label={t('hero.rating')}
                value={
                    <AnimatedMonoNumber
                        value={product.rating}
                        formatter={(v) => (v != null ? formatRating(v) : '—')}
                    />
                }
            />
            <KpiCard
                label={t('hero.reviews')}
                value={
                    <AnimatedMonoNumber
                        value={product.review_count}
                        formatter={(v) => (v != null ? formatCount(v) : '—')}
                    />
                }
            />
            <KpiCard
                label={t('hero.dailySales')}
                value={
                    <AnimatedMonoNumber
                        value={product.daily_velocity}
                        formatter={(v) => (v != null ? `${formatCount(v)} / day` : '—')}
                    />
                }
            />
            <KpiCard
                label={t('hero.revenue')}
                value={
                    <AnimatedMonoNumber
                        value={product.monthly_revenue}
                        formatter={(v) => (v != null ? formatCompactMoney(v) : '—')}
                    />
                }
                sub={isPendingEnrichment ? 'enriching…' : undefined}
            />
            <KpiCard
                label={t('hero.net')}
                value={
                    <AnimatedMonoNumber
                        value={product.net_per_unit}
                        formatter={formatMoney}
                    />
                }
                valueClassName={cn(
                    product.net_per_unit != null && netPositive
                        ? 'text-success-fg'
                        : product.net_per_unit != null && !netPositive
                            ? 'text-error-fg'
                            : '',
                )}
            />
        </div>
    )
}
