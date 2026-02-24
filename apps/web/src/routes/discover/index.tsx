import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Heading, Body } from '@/components/building-blocks/typography'
import { Stack } from '@/components/building-blocks/layout'
import { AsyncBoundary } from '@/components/shared/AsyncBoundary'
import { TrendingFeed } from '@/pages/discover/components/TrendingFeed'
import { CategoryPills } from '@/pages/discover/components/CategoryPills'
import { InspireMePanel } from '@/pages/discover/components/InspireMePanel'
import { SeasonalBanner } from '@/pages/discover/components/SeasonalBanner'
import { useTrendingProducts } from '@/hooks/useDiscovery'

export const Route = createFileRoute('/discover/')({
    component: DiscoverPage,
})

function DiscoverContent() {
    const { t } = useT('discover')
    const { data: trending = [], isLoading } = useTrendingProducts()

    return (
        <Stack gap="2xl">
            {/* Header */}
            <Stack gap="xs">
                <Heading>{t('title')}</Heading>
                <Body className="text-text-muted">{t('subtitle')}</Body>
            </Stack>

            {/* Seasonal signal banner — only renders when seasonally relevant */}
            <SeasonalBanner />

            {/* Browse by category */}
            <Stack gap="sm">
                <Body style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sf-text-muted)' }}>
                    {t('categoriesTitle')}
                </Body>
                <CategoryPills />
            </Stack>

            {/* Two-column layout: trending feed + inspire-me panel */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 320px',
                    gap: '24px',
                    alignItems: 'start',
                }}
            >
                {/* Trending feed */}
                <Stack gap="sm">
                    <Body style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sf-text-muted)' }}>
                        {t('trendingTitle')}
                    </Body>
                    <TrendingFeed products={trending} isLoading={isLoading} />
                </Stack>

                {/* Inspire me panel */}
                <Stack gap="sm">
                    <Body style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sf-text-muted)' }}>
                        AI Ideas
                    </Body>
                    <InspireMePanel />
                </Stack>
            </div>
        </Stack>
    )
}

function DiscoverPage() {
    return (
        <PageContainer>
            <AsyncBoundary>
                <DiscoverContent />
            </AsyncBoundary>
        </PageContainer>
    )
}
