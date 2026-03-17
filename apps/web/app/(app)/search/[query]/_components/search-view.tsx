'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Bot, ChevronLeft, ListFilter } from 'lucide-react'
import { Button, Caption, Body, Mono, Surface, DataCard, KpiCard, StatItem, ListToolbar, TableHeader, TableHeaderCell } from '@puckora/ui'
import { FormInput } from '@/components/form'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import type { MarkState } from '@/lib/store'
import type { ProductFinancial } from '@puckora/types'
import { computeOverviewStats } from '@/lib/search-overview'
import { keywordResultsQueryOptions } from '@/queries'

// ---------------------------------------------------------------------------
// Mock data — shaped exactly like the product_financials view
// net_per_unit = price - total_amazon_fees (no COGS — that is seller-side)
// amazon_fee_pct = total_amazon_fees / price
// monthly_net = monthly_units * net_per_unit
// product_age_months relative to March 2026
// ---------------------------------------------------------------------------


const MOCK_PUCKI_SUMMARY =
    'All 7 sampled products are FBA-eligible — strong signal for hands-off fulfillment. Average FBA fee of $6.56 is reasonable for this weight class (~1.0 kg avg). The <strong>$24–30 price band drives the most revenue</strong>, led by a kids\' version at 874 units/month — suggesting demand is partly child-focused. Competition is moderate: 7 distinct brands, avg review count of 1,211. The newest listing (FlexDesk, Sep 2023) has only 188 reviews — still space for a differentiated entrant. Target the $29–38 range with a clear niche angle (material, age group, or added feature) to avoid going head-to-head with established high-review listings.'

const MOCK_RELATED_QUERIES = [
    { q: 'portable desk', count: 412 },
    { q: 'bed tray table', count: 289 },
    { q: 'laptop stand', count: 1200 },
    { q: 'sofa desk', count: 156 },
]

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmtM(n: number | null | undefined) { return '$' + Math.round(n ?? 0).toLocaleString() }
function fmtP(n: number | null | undefined) { return '$' + (n ?? 0).toFixed(2) }
function fmt(n: number | null | undefined) { return (n ?? 0).toLocaleString() }
function fmtKg(n: number | null | undefined) { return (n ?? 0).toFixed(2) + ' kg' }
function fmtDims(p: ProductFinancial) {
    const { pkg_length_cm: l, pkg_width_cm: w, pkg_height_cm: h } = p
    if (!l && !w && !h) return '—'
    return `${l ?? '?'}×${w ?? '?'}×${h ?? '?'} cm`
}
function calcMargin(p: ProductFinancial) {
    if (!p.price || !p.net_per_unit) return 0
    return Math.round((p.net_per_unit / p.price) * 100)
}

// ---------------------------------------------------------------------------
// Overview view
// ---------------------------------------------------------------------------

interface OverviewViewProps {
    products: ProductFinancial[]
    query: string
    pucki_summary: string
    related_queries: Array<{ q: string; count: number }>
    onSeeAll: () => void
}

function OverviewView({ products, query, pucki_summary, related_queries, onSeeAll }: OverviewViewProps) {
    const t = useTranslations('search')
    const stats = useMemo(() => computeOverviewStats(products), [products])

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">

                {/* Title */}
                <div>
                    <Caption as="p" className="mb-0.5">{t('amazonSearchOverview')}</Caption>
                    <Body size="lg" className="mb-3 font-medium">
                        &ldquo;{query}&rdquo;{' '}
                        <Caption as="span">
                            — {fmt(stats.total_products)} {t('productsCount')}
                        </Caption>
                    </Body>
                </div>

                {/* KPI strip */}
                <div className="grid grid-cols-4 gap-2">
                    <KpiCard label={t('avgMonthlyRevenue')} value={fmtM(stats.avg_monthly_revenue)} sub={t('top20')} accent />
                    <KpiCard label={t('avgMonthlyUnits')} value={fmt(Math.round(stats.avg_monthly_units))} sub={t('bsrEst')} />
                    <KpiCard
                        label={t('avgRating')}
                        value={stats.avg_rating.toFixed(1) + ' ★'}
                        sub={t('avgReviewsSub', { n: Math.round(stats.avg_review_count).toLocaleString() })}
                    />
                    <KpiCard
                        label={t('fbaEligible')}
                        value={fmt(stats.fba_eligible_count)}
                        sub={t('fbaEligibleSub', { total: stats.total_products })}
                        accent
                    />
                </div>

                {/* Price distribution + Amazon fee breakdown */}
                <div className="grid grid-cols-2 gap-3">
                    <DataCard title={t('priceDist')}>
                        <div className="flex flex-col gap-1.5">
                            {stats.price_buckets.map((row) => (
                                <div key={row.range} className="flex items-center gap-2">
                                    <Mono as="span" className="min-w-14">{row.range}</Mono>
                                    <div className="flex-1 h-1.25 bg-muted rounded-sm overflow-hidden">
                                        <div
                                            className={`h-1.25 rounded-sm ${row.is_sweet ? 'bg-primary' : 'bg-border'}`}
                                            style={{ width: `${row.pct * 2.27}%` }}
                                        />
                                    </div>
                                    <Caption as="span" className="min-w-7 text-right">{row.pct}%</Caption>
                                    {row.is_sweet && (
                                        <Caption as="span" className="rounded-sm bg-brand-subtle px-1.5 py-px text-primary">
                                            {t('sweetSpot')}
                                        </Caption>
                                    )}
                                </div>
                            ))}
                        </div>
                    </DataCard>

                    <DataCard title={t('amazonEconomics')}>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { val: fmtP(stats.avg_fba_fee), lbl: t('avgFbaFee') },
                                { val: fmtP(stats.avg_referral_fee), lbl: t('avgReferralFee') },
                                { val: Math.round(stats.avg_amazon_fee_pct * 100) + '%', lbl: t('amazonFeePct'), accent: true },
                                { val: fmtKg(stats.avg_pkg_weight_kg), lbl: t('avgPkgWeight') },
                            ].map((cell) => (
                                <StatItem key={cell.lbl} label={cell.lbl} value={cell.val} accent={cell.accent} valueClassName="text-base" />
                            ))}
                        </div>
                    </DataCard>
                </div>

                {/* Top categories + Market signals */}
                <div className="grid grid-cols-2 gap-3">
                    <DataCard title={t('topCategories')}>
                        <div className="flex flex-col gap-1">
                            {stats.top_categories.map((cat, i) => (
                                <div
                                    key={cat.name}
                                    className={cn(
                                        'flex items-center justify-between py-0.75',
                                        i < stats.top_categories.length - 1 && 'border-b-hairline',
                                    )}
                                >
                                    <Caption as="span" className="cursor-pointer text-foreground hover:underline">{cat.name}</Caption>
                                    <Mono as="span">{fmt(cat.count)}</Mono>
                                </div>
                            ))}
                            <div className="flex items-center justify-between py-0.75">
                                <Caption as="span">{t('moreCategoriesCount', { count: 6 })}</Caption>
                            </div>
                        </div>
                    </DataCard>

                    <DataCard title={t('marketSignals')}>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { val: fmt(stats.unique_brands), lbl: t('uniqueBrands'), sub: t('uniqueBrandsSub') },
                                { val: fmt(stats.new_listings_count), lbl: t('newListings'), sub: t('newListingsSub') },
                                { val: fmt(Math.round(stats.avg_review_count)), lbl: t('avgReviewCount'), sub: t('reviewCountSub') },
                                { val: stats.avg_rating.toFixed(1) + ' ★', lbl: t('avgRating'), sub: t('ratingFloor') },
                            ].map((cell) => (
                                <StatItem key={cell.lbl} label={cell.lbl} value={cell.val} sub={cell.sub} valueClassName="text-base" />
                            ))}
                        </div>
                    </DataCard>
                </div>

                {/* Top 5 by revenue — image strip */}
                <DataCard title={t('top5Revenue')}>
                    <div className="flex gap-1.5">
                        {stats.top_products.map((p) => (
                            <div
                                key={p.asin ?? ''}
                                className="border-hairline flex size-14 shrink-0 cursor-pointer items-center justify-center rounded bg-card"
                            />
                        ))}
                    </div>
                    <Caption as="p" className="mt-1.5">{t('tapToOpen')}</Caption>
                </DataCard>

                {/* Pucki summary */}
                <Surface variant="card" padding="sm" className="flex items-start gap-2.5">
                    <div className="border-hairline-default mt-[1px] flex size-5 shrink-0 items-center justify-center rounded-full bg-background">
                        <Bot size={11} aria-hidden="true" className="text-faint" />
                    </div>
                    <div className="leading-relaxed text-muted-foreground">
                        <strong className="font-medium text-primary">Pucki:</strong>{' '}
                        <span dangerouslySetInnerHTML={{ __html: pucki_summary }} />
                    </div>
                </Surface>

                {/* Quick-action pills */}
                <div className="flex flex-wrap gap-1.5">
                    <Button
                        onClick={onSeeAll}
                        variant="ghost"
                        size="sm"
                        className="h-auto cursor-pointer whitespace-nowrap rounded-full border-hairline-default bg-foreground px-3.5 py-1.5 text-background hover:bg-foreground/90"
                    >
                        {t('seeAllProducts', { count: stats.total_products })}
                    </Button>
                    {stats.new_listings_count > 0 && (
                        <Button
                            onClick={onSeeAll}
                            variant="ghost"
                            size="sm"
                            className="h-auto cursor-pointer whitespace-nowrap rounded-full border-hairline-default bg-background px-3.5 py-1.5 text-muted-foreground hover:bg-card"
                        >
                            {t('newListingsOnly', { count: stats.new_listings_count })}
                        </Button>
                    )}
                    {stats.price_buckets.find(b => b.is_sweet) && (
                        <Button
                            onClick={onSeeAll}
                            variant="ghost"
                            size="sm"
                            className="h-auto cursor-pointer whitespace-nowrap rounded-full border-hairline-default bg-background px-3.5 py-1.5 text-muted-foreground hover:bg-card"
                        >
                            {t('priceRangeOnly', { range: stats.price_buckets.find(b => b.is_sweet)!.range })}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Product list view
// ---------------------------------------------------------------------------

const MARK_STATES: (MarkState | null)[] = [null, 'interested', 'competitor', 'investigate']
const MARK_BTN_STYLE: Record<MarkState, string> = {
    interested: 'bg-success-surface text-success-fg border-transparent',
    competitor: 'bg-warning-surface text-warning-fg border-transparent',
    investigate: 'bg-card text-faint border-transparent',
}

function ProductRow({
    product, isExpanded, onToggle,
    markState, onCycleMark, onSetMark, note, onNoteChange,
}: {
    product: ProductFinancial
    isExpanded: boolean
    onToggle: () => void
    markState: MarkState | null
    onCycleMark: () => void
    onSetMark: (s: MarkState) => void
    note: string
    onNoteChange: (v: string) => void
}) {
    const t = useTranslations('search')

    return (
        <div className="border-b-hairline">
            {/* Main row */}
            <div
                onClick={onToggle}
                className={cn(
                    'grid product-row-grid gap-1.5 px-4 py-2 items-center cursor-pointer transition-colors',
                    isExpanded ? 'bg-card' : 'bg-background hover:bg-card',
                )}
            >
                <div className="flex flex-col gap-px">
                    <Caption as="span" className="font-medium text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                        {product.title}
                    </Caption>
                    <Caption as="span" className="text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                        {product.brand} · {product.asin}
                    </Caption>
                </div>
                <Mono as="span" className="whitespace-nowrap">{fmtP(product.price)}</Mono>
                <Mono as="span" className="whitespace-nowrap">{fmt(product.monthly_units)}</Mono>
                <Mono as="span" className="whitespace-nowrap text-primary">{fmtM(product.monthly_revenue)}</Mono>
                <Mono as="span" className="whitespace-nowrap text-primary">{fmtP(product.net_per_unit)}</Mono>
                <Mono as="span" className="whitespace-nowrap">{fmtP(product.fba_fee)}</Mono>
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                        onClick={onCycleMark}
                        variant="ghost"
                        size="sm"
                        className={cn(
                            'h-auto py-0.75 px-2 rounded-full text-xs whitespace-nowrap border-[0.5px]',
                            markState ? MARK_BTN_STYLE[markState] : 'bg-transparent text-faint border-border',
                        )}
                    >
                        {markState ?? t('productMark')}
                    </Button>
                </div>
            </div>

            {/* Expanded layer 2 */}
            {isExpanded && (
                <div className="px-4 py-3 bg-card border-t-hairline">
                    <div className="grid grid-cols-5 gap-2 mb-3">
                        {[
                            { label: t('productStats_monthlyRevenue'), val: fmtM(product.monthly_revenue), sub: t('productStats_unitsPerMonth', { units: fmt(product.monthly_units) }), accent: true },
                            { label: t('productStats_netPerUnit'), val: fmtP(product.net_per_unit), sub: t('productStats_netMargin', { pct: calcMargin(product) }), accent: true },
                            { label: t('productStats_fbaFee'), val: fmtP(product.fba_fee), sub: t('productStats_fbaDetail', { ref: fmtP(product.referral_fee), total: fmtP(product.total_amazon_fees) }) },
                            { label: t('productStats_bsrRank'), val: `#${fmt(product.rank)}`, sub: t('productStats_dailyVelocity', { v: product.daily_velocity ?? 0 }) },
                            { label: t('productStats_package'), val: `${product.pkg_weight_kg ?? '—'} kg`, sub: fmtDims(product) },
                        ].map((stat) => (
                            <StatItem
                                key={stat.label}
                                label={stat.label}
                                value={stat.val}
                                sub={stat.sub}
                                accent={stat.accent}
                            />
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center">
                        {[
                            { label: t('productActions_open'), primary: true },
                            { label: t('productActions_findSuppliers') },
                            { label: t('productActions_calcFees') },
                            { label: t('productActions_analyzeReviews') },
                        ].map(({ label, primary }) => (
                            <Button
                                key={label}
                                variant={primary ? 'primary' : 'secondary'}
                                size="sm"
                                className="h-auto py-1.25 rounded-md whitespace-nowrap"
                            >
                                {label}
                            </Button>
                        ))}

                        {/* Mark picker */}
                        <div className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Caption>{t('productMarkAs')}</Caption>
                            {(['interested', 'competitor', 'investigate'] as MarkState[]).map((state) => (
                                <Button
                                    key={state}
                                    onClick={() => onSetMark(state)}
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        'h-auto py-1 px-2.5 rounded-full text-xs border-[0.5px]',
                                        markState === state
                                            ? MARK_BTN_STYLE[state]
                                            : 'bg-transparent text-muted-foreground border-border',
                                    )}
                                >
                                    {state}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {markState && (
                        <div className="mt-2 flex gap-1.5 items-center">
                            <FormInput
                                value={note}
                                onChange={(e) => onNoteChange(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder={t('productNotePlaceholder')}
                                className="h-9 flex-1"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function ProductsView({ products, query, onBack }: { products: ProductFinancial[]; query: string; onBack: () => void }) {
    const [expanded, setExpanded] = useState<string | null>(null)
    const [notes, setNotes] = useState<Record<string, string>>({})
    const t = useTranslations('search')
    const { markedProducts, markProduct, unmarkProduct } = useAppStore()

    function cycleMark(p: ProductFinancial) {
        const asin = p.asin ?? ''
        const cur = markedProducts[asin]?.markState ?? null
        const idx = MARK_STATES.indexOf(cur)
        const next = MARK_STATES[(idx + 1) % MARK_STATES.length]
        if (next === null) {
            unmarkProduct(asin)
        } else {
            markProduct({ asin, name: p.title ?? '', markState: next, note: notes[asin] })
        }
    }

    function setMark(p: ProductFinancial, state: MarkState) {
        const asin = p.asin ?? ''
        markProduct({ asin, name: p.title ?? '', markState: state, note: notes[asin] })
    }

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* List topbar */}
            <ListToolbar>
                <Button
                    onClick={onBack}
                    variant="ghost"
                    size="sm"
                    className="h-auto gap-1 p-0 text-faint hover:bg-transparent hover:text-foreground"
                    icon={<ChevronLeft size={12} />}
                >
                    {t('overview')}
                </Button>
                <Caption as="span" className="text-border">/</Caption>
                <Caption as="span" className="font-medium text-foreground">&ldquo;{query}&rdquo;</Caption>
                <Button
                    variant="secondary"
                    size="sm"
                    className="h-auto rounded-[6px] px-2.5 py-1"
                    icon={<ListFilter size={10} />}
                >
                    {t('filter')}
                </Button>
                <Mono as="span" className="ml-auto">
                    {fmt(products.length)} {t('productsCount')}
                </Mono>
            </ListToolbar>

            {/* Table header */}
            <TableHeader gridClassName="product-row-grid">
                {[t('colProduct'), t('colPrice'), t('colUnits'), t('colRevenue'), t('colNet'), t('colFee'), t('colMark')].map((h) => (
                    <TableHeaderCell key={h}>{h}</TableHeaderCell>
                ))}
            </TableHeader>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto bg-background">
                {products.map((p) => (
                    <ProductRow
                        key={p.asin ?? ''}
                        product={p}
                        isExpanded={expanded === p.asin}
                        onToggle={() => setExpanded(expanded === (p.asin ?? '') ? null : (p.asin ?? ''))}
                        markState={markedProducts[p.asin ?? '']?.markState ?? null}
                        onCycleMark={() => cycleMark(p)}
                        onSetMark={(s) => setMark(p, s)}
                        note={notes[p.asin ?? ''] ?? ''}
                        onNoteChange={(v) => setNotes((prev) => ({ ...prev, [p.asin ?? '']: v }))}
                    />
                ))}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Waiting / loading state
// ---------------------------------------------------------------------------

function SearchingState({ query }: { query: string }) {
    const t = useTranslations('search')
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
            <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
            <Body size="lg" className="font-medium">{t('searchingTitle')}</Body>
            <Caption as="p" className="max-w-xs text-center">&ldquo;{query}&rdquo; — {t('searchingSubtitle')}</Caption>
        </div>
    )
}

// ---------------------------------------------------------------------------
// SearchView — orchestrator
// ---------------------------------------------------------------------------

interface SearchViewProps {
    query: string
    initialView: 'overview' | 'products'
    /** SSR-prefetched products. Used as initialData; empty while background tasks are running. */
    products: ProductFinancial[]
    marketplace: string
}

export function SearchView({ query, initialView, products: initialProducts, marketplace }: SearchViewProps) {
    const [view, setView] = useState<'overview' | 'products'>(initialView)
    const router = useRouter()
    const pathname = usePathname()

    // Poll until SP-API + scraper background tasks have written results.
    // When SSR delivered products, mark initialData as fresh so there's no
    // immediate refetch — polling only activates when the list is empty.
    // Cap at 40 attempts (~2 min) to avoid an infinite loop if the job stalls.
    const baseQueryOpts = keywordResultsQueryOptions(query, marketplace)
    const { data: products = [] } = useQuery<ProductFinancial[]>({
        ...baseQueryOpts,
        initialData: initialProducts,
        initialDataUpdatedAt: initialProducts.length > 0 ? Date.now() : 0,
        refetchInterval: (q) => {
            if (((q.state.data as ProductFinancial[] | undefined)?.length ?? 0) > 0) return false
            if ((q.state.dataUpdateCount ?? 0) >= 40) return false
            return 3_000
        },
        retry: false,
    })

    const { setPuckiContext } = useAppStore()

    // Keep Pucki context in sync
    useEffect(() => {
        setPuckiContext({ currentQuery: query, currentModule: 'search' })
    }, [query, setPuckiContext])

    function showProducts() {
        setView('products')
        router.replace(`${pathname}?view=products`, { scroll: false })
    }

    function showOverview() {
        setView('overview')
        router.replace(pathname, { scroll: false })
    }

    return (
        <div className="flex h-full flex-col overflow-hidden">
            {products.length === 0 ? (
                <SearchingState query={query} />
            ) : view === 'overview' ? (
                <OverviewView
                    products={products}
                    query={query}
                    pucki_summary={MOCK_PUCKI_SUMMARY}
                    related_queries={MOCK_RELATED_QUERIES}
                    onSeeAll={showProducts}
                />
            ) : (
                <ProductsView products={products} query={query} onBack={showOverview} />
            )}
        </div>
    )
}
