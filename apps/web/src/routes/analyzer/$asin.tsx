import React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Heading, Body, Caption } from '@/components/building-blocks/typography'
import { Stack, Row, Grid } from '@/components/building-blocks/layout'
import { Button } from '@/components/building-blocks/Button'
import { SilkAlert } from '@repo/ui'
import { useProductDetailQuery } from '@/hooks/useProductDetail'
import { useSaveProduct } from '@/hooks/useTrackerProducts'
import { ProductHeader } from '@/pages/analyzer/components/ProductHeader'
import { MarketOverview } from '@/pages/analyzer/components/MarketOverview'
import { BSRChart } from '@/pages/analyzer/components/BSRChart'
import { PriceChart } from '@/pages/analyzer/components/PriceChart'
import { ReviewDistributionChart } from '@/pages/analyzer/components/ReviewDistribution'
import { SellerBreakdownPanel } from '@/pages/analyzer/components/SellerBreakdown'
import { IconArrowLeft, IconBookmark } from '@tabler/icons-react'

export const Route = createFileRoute('/analyzer/$asin')({
    component: AnalyzerPage,
})

function AnalyzerPage() {
    const { t } = useT('analyzer')
    const { asin } = Route.useParams()
    const { data: product, isLoading, error } = useProductDetailQuery({ asin })
    const saveProduct = useSaveProduct()

    function handleSave() {
        if (!product) return
        saveProduct.mutate({ asin: product.asin, marketplace: product.marketplace ?? 'US' })
    }

    if (isLoading) {
        return (
            <PageContainer>
                <Stack gap="lg">
                    <Row gap="sm" className="items-center">
                        <Link to="/analyzer" className="text-text-muted hover:text-text-primary">
                            <IconArrowLeft size={16} />
                        </Link>
                        <Body className="text-text-muted font-mono text-sm">{asin}</Body>
                    </Row>
                    <div className="animate-pulse space-y-3">
                        <div className="h-28 bg-surface-secondary border border-border" />
                        <div className="h-24 bg-surface-secondary border border-border" />
                        <div className="h-56 bg-surface-secondary border border-border" />
                    </div>
                </Stack>
            </PageContainer>
        )
    }

    if (error || !product) {
        return (
            <PageContainer>
                <Stack gap="lg">
                    <Link to="/analyzer" className="flex items-center gap-1 text-text-muted hover:text-text-primary text-sm">
                        <IconArrowLeft size={14} /> Back
                    </Link>
                    <SilkAlert variant="error">
                        {error ? t('errors.notFound') : t('errors.invalid')}
                    </SilkAlert>
                </Stack>
            </PageContainer>
        )
    }

    return (
        <PageContainer>
            <Stack gap="xl">
                <Row className="items-center justify-between">
                    <Link to="/analyzer" className="flex items-center gap-1 text-text-muted hover:text-text-primary text-sm transition-colors">
                        <IconArrowLeft size={14} />
                        <span>{t('title')}</span>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={handleSave} disabled={saveProduct.isPending}>
                        <Row gap="xs" className="items-center">
                            <IconBookmark size={14} />
                            <span>Save to Tracker</span>
                        </Row>
                    </Button>
                </Row>

                <ProductHeader product={product} />
                <MarketOverview product={product} />

                <Grid cols={2} gap="lg">
                    <Stack gap="sm">
                        <Heading className="text-sm">{t('trend.title')} — BSR</Heading>
                        <BSRChart asin={asin} />
                    </Stack>
                    <Stack gap="sm">
                        <Heading className="text-sm">{t('trend.title')} — {t('price')}</Heading>
                        <PriceChart asin={asin} />
                    </Stack>
                </Grid>

                <Grid cols={2} gap="lg">
                    <ReviewDistributionChart reviews_sample={product.reviews_sample ?? []} />
                    <SellerBreakdownPanel seller_count={product.seller_count} fba_seller_count={product.fba_seller_count} />
                </Grid>

                {product.bullet_points && product.bullet_points.length > 0 && (
                    <Stack gap="sm">
                        <Heading className="text-sm">Key Features</Heading>
                        <ul className="space-y-1">
                            {product.bullet_points.map((b, i) => (
                                <li key={i} className="flex gap-2">
                                    <Caption className="text-accent-primary mt-0.5">•</Caption>
                                    <Body className="text-sm text-text-secondary">{b}</Body>
                                </li>
                            ))}
                        </ul>
                    </Stack>
                )}
            </Stack>
        </PageContainer>
    )
}
