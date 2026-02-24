import React from 'react'
import { Link } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { useTrackerProducts } from '@/hooks/useTrackerProducts'
import { Stack, Row } from '@/components/building-blocks/layout'
import { Body, Caption, Label, Mono } from '@/components/building-blocks/typography'
import { SilkCard } from '@repo/ui'
import { formatCurrency, formatNumber } from '@repo/utils'
import { IconTrendingUp } from '@tabler/icons-react'

interface ProductJoin {
    id: string
    asin: string | null
    title: string | null
    main_image_url: string | null
    price: number | null
    bsr: number | null
    rating: number | null
    review_count: number | null
    monthly_sales_est: number | null
    marketplace: string | null
    brand: string | null
    bsr_category: string | null
}

type TrackedWP = {
    id: string
    stage: string
    product: ProductJoin | null
}

type MetricDef = { label: string; get: (p: ProductJoin) => string }

const METRICS: MetricDef[] = [
    { label: 'Price',        get: p => p.price != null         ? formatCurrency(p.price)          : '--' },
    { label: 'BSR',          get: p => p.bsr != null           ? `#${formatNumber(p.bsr)}`         : '--' },
    { label: 'Rating',       get: p => p.rating != null        ? `* ${p.rating.toFixed(1)}`        : '--' },
    { label: 'Reviews',      get: p => p.review_count != null  ? formatNumber(p.review_count)      : '--' },
    { label: 'Est. Sales/mo',get: p => p.monthly_sales_est != null ? formatNumber(p.monthly_sales_est) : '--' },
    { label: 'Marketplace',  get: p => p.marketplace ?? '--' },
    { label: 'Category',     get: p => p.bsr_category ?? '--' },
]

export function ProductComparator() {
    const { t } = useT('tracker')
    const { data: products = [] } = useTrackerProducts()
    const typed = products as unknown as TrackedWP[]
    const withProduct = typed.filter(p => p.product != null).slice(0, 4)

    if (withProduct.length === 0) {
        return (
            <SilkCard className="p-8 text-center">
                <Body className="text-text-muted">{t('compare.addProduct')}</Body>
            </SilkCard>
        )
    }

    return (
        <SilkCard className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left">
                            <Caption className="text-text-muted uppercase text-[10px] tracking-wider">Product</Caption>
                        </th>
                        {withProduct.map(item => (
                            <th key={item.id} className="px-4 py-3 text-left min-w-[180px]">
                                <Stack gap="xs">
                                    {item.product?.main_image_url && (
                                        <img
                                            src={item.product.main_image_url}
                                            alt={item.product.title ?? ''}
                                            className="w-12 h-12 object-contain border border-border"
                                        />
                                    )}
                                    <Label className="text-xs font-medium line-clamp-2">{item.product?.title ?? '--'}</Label>
                                    {item.product?.asin && (
                                        <Row gap="xs" className="items-center">
                                            <Mono className="text-[10px] text-text-muted">{item.product.asin}</Mono>
                                            <Link to="/analyzer/$asin" params={{ asin: item.product.asin }}>
                                                <IconTrendingUp size={11} className="text-accent-primary" />
                                            </Link>
                                        </Row>
                                    )}
                                </Stack>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {METRICS.map(metric => (
                        <tr key={metric.label} className="border-b border-border last:border-0 hover:bg-surface-secondary transition-colors">
                            <td className="px-4 py-2.5">
                                <Caption className="text-text-muted">{metric.label}</Caption>
                            </td>
                            {withProduct.map(item => (
                                <td key={item.id} className="px-4 py-2.5">
                                    <Body className="text-sm">
                                        {item.product ? metric.get(item.product) : '--'}
                                    </Body>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </SilkCard>
    )
}
