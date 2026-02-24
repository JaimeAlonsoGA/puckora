import React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Display, Heading, Body, Caption, Label } from '@/components/building-blocks/typography'
import { Stack, Row, Grid } from '@/components/building-blocks/layout'
import { AsyncBoundary } from '@/components/shared/AsyncBoundary'
import { usePlan } from '@/hooks/usePlan'
import { useAuth } from '@/hooks/useAuth'
import { useTrackerProducts } from '@/hooks/useTrackerProducts'
import { useProductContext } from '@/contexts/ProductContext'
import { Button } from '@/components/building-blocks/Button'
import { KPICard, SilkCard, SilkBadge, SilkAlert } from '@repo/ui'
import { formatRelativeTime, formatCurrency } from '@repo/utils'
import {
    IconSearch, IconChartBar, IconCalculator,
    IconTruck, IconBookmark, IconBug,
    IconArrowRight, IconTrendingUp, IconPlayerPlay,
} from '@tabler/icons-react'

export const Route = createFileRoute('/')({
    component: DashboardPage,
})

const QUICK_ACTIONS = [
    { to: '/research', icon: IconSearch, titleKey: 'research', descKey: 'research.subtitle', accent: 'gold' },
    { to: '/analyzer', icon: IconChartBar, titleKey: 'analyzer', descKey: 'analyzer.subtitle', accent: 'scarlet' },
    { to: '/cost-calculator', icon: IconCalculator, titleKey: 'calculator', descKey: 'calculator.subtitle', accent: 'purple' },
    { to: '/sourcing', icon: IconTruck, titleKey: 'sourcing', descKey: 'sourcing.subtitle', accent: 'gold' },
    { to: '/tracker', icon: IconBookmark, titleKey: 'tracker', descKey: 'tracker.subtitle', accent: 'scarlet' },
    { to: '/competitor-intel', icon: IconBug, titleKey: 'competitor', descKey: 'competitor.subtitle', accent: 'purple' },
] as const

const PLAN_ACCENT: Record<string, 'gold' | 'scarlet' | 'purple' | 'success'> = {
    free: 'gold',
    starter: 'gold',
    pro: 'scarlet',
    agency: 'purple',
}

function DashboardContent() {
    const { t: tNav } = useT('nav')
    const { t: tResearch } = useT('research')
    const { t: tCalc } = useT('calculator')
    const { t: tSourcing } = useT('sourcing')
    const { t: tComp } = useT('competitor')
    const { t: tTracker } = useT('tracker')
    const { t: tAnalyzer } = useT('analyzer')
    const { user } = useAuth()
    const { plan, limits } = usePlan()
    const { data: trackedProducts = [] } = useTrackerProducts()
    const { activeProduct, lastModuleUsed } = useProductContext()
    const navigate = useNavigate()

    // Type cast for the joined product data
    type JoinedTP = { id: string; stage: string; created_at: string; product: { asin: string | null; title: string | null; main_image_url: string | null; price: number | null } | null }
    const recentTracked = (trackedProducts as unknown as JoinedTP[]).slice(0, 5)

    const greeting = user?.user_metadata?.full_name
        ? `Welcome back, ${user.user_metadata.full_name.split(' ')[0]}`
        : 'Welcome back'

    const translationMap: Record<string, (key: string) => string> = {
        research: tResearch as (key: string) => string,
        analyzer: tAnalyzer as (key: string) => string,
        calculator: tCalc as (key: string) => string,
        sourcing: tSourcing as (key: string) => string,
        tracker: tTracker as (key: string) => string,
        competitor: tComp as (key: string) => string,
    }

    return (
        <Stack gap="2xl">
            {/* Header */}
            <Stack gap="xs">
                <Display>{greeting}</Display>
                <Body className="text-text-muted">
                    Plan: <span className="font-medium text-text-secondary uppercase tracking-wide">{plan}</span>
                </Body>
            </Stack>

            {/* Plan KPIs */}
            <Grid cols={4} gap="md">
                <KPICard
                    label="Tracked Products"
                    value={String(trackedProducts.length)}
                    accent={PLAN_ACCENT[plan] ?? 'gold'}
                />
                <KPICard
                    label="Daily Searches"
                    value={limits?.dailySearches === -1 ? '∞' : (limits?.dailySearches ?? '—')}
                    accent={PLAN_ACCENT[plan] ?? 'gold'}
                />
                <KPICard
                    label="Competitor Analyses / mo"
                    value={limits?.competitorAnalysesPerMonth === -1 ? '∞' : (limits?.competitorAnalysesPerMonth ?? '—')}
                    accent={PLAN_ACCENT[plan] ?? 'gold'}
                />
                <KPICard
                    label="Saved Products Limit"
                    value={limits?.savedProducts === -1 ? '∞' : (limits?.savedProducts ?? '—')}
                    accent={PLAN_ACCENT[plan] ?? 'gold'}
                />
            </Grid>

            {/* Continue where you left off */}
            {activeProduct && lastModuleUsed && (
                <SilkAlert variant="info">
                    <Row gap="md" align="center">
                        {activeProduct.image_url && (
                            <img
                                src={activeProduct.image_url}
                                alt={activeProduct.title ?? ''}
                                style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0, border: '1px solid var(--sf-border)' }}
                            />
                        )}
                        <Stack gap="xs" className="flex-1 min-w-0">
                            <Caption style={{ fontWeight: 600, color: 'var(--sf-text)' }}>
                                Continue where you left off
                            </Caption>
                            <Caption style={{ color: 'var(--sf-text-muted)', fontSize: '11px' }} className="truncate">
                                {activeProduct.title}
                            </Caption>
                        </Stack>
                        <Button
                            variant="primary"
                            size="sm"
                            icon={<IconPlayerPlay size={12} />}
                            onClick={() => {
                                const routes: Record<string, string> = {
                                    analyzer: `/analyzer/${activeProduct.asin}`,
                                    sourcing: '/sourcing/',
                                    calculator: '/cost-calculator/',
                                    'competitor-intel': `/competitor-intel/${activeProduct.asin}`,
                                }
                                const dest = routes[lastModuleUsed] ?? `/${lastModuleUsed}/`
                                navigate({ to: dest as never })
                            }}
                        >
                            Resume in {lastModuleUsed}
                        </Button>
                    </Row>
                </SilkAlert>
            )}

            {/* Recent tracked products */}
            {recentTracked.length > 0 && (
                <Stack gap="md">
                    <Row className="items-center justify-between">
                        <Heading>Recent Tracked Products</Heading>
                        <Link to="/tracker" className="flex items-center gap-1 text-xs text-accent-primary hover:underline">
                            <span>View all</span>
                            <IconArrowRight size={11} />
                        </Link>
                    </Row>
                    <SilkCard>
                        <div className="divide-y divide-border">
                            {recentTracked.map(item => (
                                <Row key={item.id} gap="md" className="px-4 py-3 items-center hover:bg-surface-secondary transition-colors">
                                    {item.product?.main_image_url && (
                                        <img src={item.product.main_image_url} alt={item.product.title ?? ''} className="w-10 h-10 object-contain border border-border shrink-0" />
                                    )}
                                    <Stack gap="xs" className="flex-1 min-w-0">
                                        <Label className="text-sm truncate">{item.product?.title ?? item.id}</Label>
                                        <Row gap="sm">
                                            {item.product?.asin && <Caption className="text-text-muted font-mono text-[10px]">{item.product.asin}</Caption>}
                                            <SilkBadge variant="muted" className="text-[10px]">{item.stage}</SilkBadge>
                                        </Row>
                                    </Stack>
                                    {item.product?.price != null && (
                                        <Caption className="text-text-secondary shrink-0">{formatCurrency(item.product.price)}</Caption>
                                    )}
                                    {item.product?.asin && (
                                        <Link to="/analyzer/$asin" params={{ asin: item.product.asin }}>
                                            <IconTrendingUp size={15} className="text-text-muted hover:text-accent-primary transition-colors" />
                                        </Link>
                                    )}
                                </Row>
                            ))}
                        </div>
                    </SilkCard>
                </Stack>
            )}

            {/* Quick actions */}
            <Stack gap="md">
                <Heading>Tools</Heading>
                <Grid cols={3} gap="md">
                    {QUICK_ACTIONS.map(({ to, icon: Icon, titleKey, descKey }) => {
                        const ns = descKey.split('.')[0] as keyof typeof translationMap
                        const tf = translationMap[ns] ?? tResearch
                        return (
                            <Link
                                key={to}
                                to={to}
                                className="group border border-border bg-surface-secondary p-5 flex flex-col gap-3 hover:border-border-strong transition-colors"
                            >
                                <Row className="justify-between items-start">
                                    <div className="p-2 bg-surface-tertiary border border-border">
                                        <Icon size={18} className="text-text-secondary" />
                                    </div>
                                    <IconArrowRight
                                        size={14}
                                        className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                </Row>
                                <Stack gap="xs">
                                    <Caption>{tNav(titleKey)}</Caption>
                                    <Body className="text-text-muted text-xs leading-relaxed">
                                        {tf('subtitle')}
                                    </Body>
                                </Stack>
                            </Link>
                        )
                    })}
                </Grid>
            </Stack>
        </Stack>
    )
}

function DashboardPage() {
    return (
        <PageContainer>
            <AsyncBoundary>
                <DashboardContent />
            </AsyncBoundary>
        </PageContainer>
    )
}
