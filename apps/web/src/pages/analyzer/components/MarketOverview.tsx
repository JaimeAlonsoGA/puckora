import React from 'react'
import { KPICard } from '@repo/ui'
import { Grid } from '@/components/building-blocks/layout'
import type { AmazonProductDetail } from '@repo/types'
import { formatCurrency, formatNumber, formatCompact } from '@repo/utils'
import { useT } from '@/hooks/useT'

export interface MarketOverviewProps {
    product: AmazonProductDetail
}

export function MarketOverview({ product }: MarketOverviewProps) {
    const { t } = useT('analyzer')

    const sellerCount = product.seller_count ?? 0
    const fbaCount = product.fba_seller_count ?? 0
    const fbaPct = sellerCount > 0 ? Math.round((fbaCount / sellerCount) * 100) : 0

    const metrics = [
        {
            label: t('bsr'),
            value: formatNumber(product.bsr ?? 0),
            prefix: '#',
        },
        {
            label: t('price'),
            value: formatCurrency(product.price ?? 0),
        },
        {
            label: t('reviews'),
            value: formatCompact(product.review_count ?? 0),
        },
        {
            label: t('rating'),
            value: `${(product.rating ?? 0).toFixed(1)} ★`,
        },
        {
            label: t('monthlySales'),
            value: formatCompact(product.monthly_sales_est ?? 0),
        },
        {
            label: t('monthlyRevenue'),
            value: formatCurrency((product.monthly_sales_est ?? 0) * (product.price ?? 0)),
            compact: true,
        },
        {
            label: 'Sellers',
            value: String(sellerCount),
        },
        {
            label: 'FBA %',
            value: `${fbaPct}%`,
        },
    ]

    return (
        <Grid cols={4} gap="sm">
            {metrics.map(m => (
                <KPICard
                    key={m.label}
                    label={m.label}
                    value={m.value}
                />
            ))}
        </Grid>
    )
}
