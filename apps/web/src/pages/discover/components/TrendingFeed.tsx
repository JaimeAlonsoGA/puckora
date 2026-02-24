import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { useProductContext } from '@/contexts/ProductContext'
import { useSaveProduct } from '@/hooks/useTrackerProducts'
import { Stack, Row, Grid } from '@/components/building-blocks/layout'
import { Caption } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks/Button'
import { SilkCard, SilkBadge } from '@repo/ui'
import { formatCurrency } from '@repo/utils'
import type { TrendingProduct } from '@repo/types'
import type { AmazonProduct } from '@repo/types'
import {
    IconChartBar, IconTruck, IconCalculator, IconBookmark,
    IconTrendingUp, IconStar,
} from '@tabler/icons-react'

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
    if (score == null) return null
    const colour = score >= 70 ? 'var(--sf-success)' : score >= 40 ? 'var(--sf-gold)' : 'var(--sf-text-muted)'
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontSize: '9px', color: 'var(--sf-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: colour }}>{Math.round(score)}</span>
        </div>
    )
}

function TrendingProductCard({ product }: { product: TrendingProduct }) {
    const { t } = useT('discover')
    const { setActiveProduct, markModuleUsed } = useProductContext()
    const saveProduct = useSaveProduct()
    const navigate = useNavigate()

    // Map TrendingProduct → AmazonProduct for context
    const asAmazonProduct: AmazonProduct = {
        asin: product.asin,
        title: product.title,
        image_url: product.image_url ?? null,
        price: product.price ? Number(product.price) : null,
        currency: 'USD',
        bsr: product.bsr ?? null,
        bsr_category: product.category ?? null,
        monthly_sales_est: product.monthly_sales_est ?? null,
        rating: null,
        review_count: null,
        marketplace: (product.marketplace as never) ?? 'US',
    }

    function activate(module: string, to: string) {
        setActiveProduct(asAmazonProduct)
        markModuleUsed(module)
        navigate({ to: to as never })
    }

    return (
        <SilkCard variant="default" padding="md">
            <Stack gap="sm">
                {/* Image + title */}
                <Row gap="sm" className="items-start">
                    {product.image_url && (
                        <img
                            src={product.image_url}
                            alt={product.title}
                            style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }}
                        />
                    )}
                    <Stack gap="xs" className="flex-1 min-w-0">
                        <p
                            style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--sf-text)',
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {product.title}
                        </p>
                        {product.category && (
                            <Caption style={{ color: 'var(--sf-text-muted)' }}>{product.category}</Caption>
                        )}
                    </Stack>
                </Row>

                {/* KPI row */}
                <Row gap="md" wrap>
                    {product.price != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text)' }}>
                                {formatCurrency(Number(product.price))}
                            </span>
                        </div>
                    )}
                    {product.bsr != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <IconTrendingUp size={11} style={{ color: 'var(--sf-text-muted)' }} />
                            <span style={{ fontSize: '11px', color: 'var(--sf-text-muted)' }}>
                                BSR #{product.bsr.toLocaleString()}
                            </span>
                        </div>
                    )}
                    <ScoreBadge score={product.opportunity_score ? Number(product.opportunity_score) : null} label="Opp" />
                    <ScoreBadge score={product.competition_score ? Number(product.competition_score) : null} label="Comp" />
                </Row>

                {/* Action buttons */}
                <Row gap="xs" wrap>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<IconChartBar size={12} />}
                        onClick={() => activate('analyzer', `/analyzer/${product.asin}`)}
                    >
                        {t('results.analyze')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<IconTruck size={12} />}
                        onClick={() => activate('sourcing', '/sourcing')}
                    >
                        {t('results.source')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<IconCalculator size={12} />}
                        onClick={() => activate('calculator', '/cost-calculator')}
                    >
                        {t('results.calculate')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<IconBookmark size={12} />}
                        onClick={() => saveProduct.mutate({ asin: product.asin, marketplace: product.marketplace as never ?? 'US' })}
                        loading={saveProduct.isPending}
                    >
                        {t('results.save')}
                    </Button>
                </Row>
            </Stack>
        </SilkCard>
    )
}

interface TrendingFeedProps {
    products: TrendingProduct[]
    isLoading: boolean
}

export function TrendingFeed({ products, isLoading }: TrendingFeedProps) {
    const { t } = useT('discover')

    if (isLoading) {
        return (
            <Grid cols={3} gap="md">
                {Array.from({ length: 6 }).map((_, i) => (
                    <SilkCard key={i} variant="flat" padding="md">
                        <Stack gap="sm">
                            <div style={{ height: 48, background: 'var(--sf-border)', animation: 'pulse 2s infinite' }} />
                            <div style={{ height: 12, background: 'var(--sf-border)', width: '80%' }} />
                            <div style={{ height: 12, background: 'var(--sf-border)', width: '60%' }} />
                        </Stack>
                    </SilkCard>
                ))}
            </Grid>
        )
    }

    if (products.length === 0) {
        return (
            <SilkCard variant="flat" padding="lg">
                <p style={{ fontSize: '13px', color: 'var(--sf-text-muted)', textAlign: 'center' }}>
                    {t('trendingEmpty')}
                </p>
            </SilkCard>
        )
    }

    return (
        <Grid cols={3} gap="md">
            {products.map(p => (
                <TrendingProductCard key={p.id} product={p} />
            ))}
        </Grid>
    )
}
