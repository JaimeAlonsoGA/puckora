'use client'

import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ListFilter } from 'lucide-react'
import { Button, Caption, ListToolbar, Mono, StatItem, TableHeader, TableHeaderCell } from '@puckora/ui'
import { FormInput } from '@/components/form'
import {
    MARK_STATE_BUTTON_CLASS_NAMES,
    MARK_STATE_CYCLE,
    MARK_STATE_VALUES,
    type MarkState,
} from '@/constants/app-state'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import type { ProductFinancial } from '@puckora/types'
import {
    formatCompactMoney,
    formatCount,
    formatDims,
    formatMargin,
    formatMoney,
    formatRank,
    formatWeight,
} from '@puckora/utils'
import { SearchProductsSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'
import { AnimatedMonoNumber, AnimatedSpanNumber } from '../search-live-animations'
import { SearchQueryIndicator } from '../search-query-indicator'
import { searchProductRoute } from '@/constants/routes'
import { getMarketplaceProductUrl } from '../search-view-helpers'

interface ProductRowProps {
    product: ProductFinancial
    isExpanded: boolean
    /** Stable parent callback — row passes its own asin. */
    onToggle: (asin: string) => void
    marketplace: string
    query: string
    note: string
    onCycleMark: (asin: string, title: string) => void
    onSetMark: (asin: string, title: string, state: MarkState) => void
    onNoteChange: (asin: string, value: string) => void
}

const ProductRow = memo(function ProductRow({
    product,
    isExpanded,
    onToggle,
    marketplace,
    query,
    note,
    onCycleMark,
    onSetMark,
    onNoteChange,
}: ProductRowProps) {
    const t = useTranslations('search')
    const tMark = useTranslations('mark')
    // Direct per-row subscription: only THIS row re-renders when its own
    // mark state changes, not the entire list (rerender-derived-state pattern).
    const asin = product.asin ?? ''
    const markState = useAppStore(state => state.markedProducts[asin]?.markState ?? null)

    return (
        <div className="border-b-hairline">
            <div
                onClick={() => onToggle(asin)}
                className={cn(
                    'grid product-row-grid cursor-pointer items-center gap-1.5 px-4 py-2 transition-colors',
                    isExpanded ? 'bg-card' : 'bg-background hover:bg-card',
                )}
            >
                <div className="flex flex-col gap-px">
                    <Caption as="span" className="overflow-hidden text-ellipsis whitespace-nowrap font-medium text-foreground">
                        {product.title ?? product.asin}
                    </Caption>
                    <Caption as="span" className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">
                        {[product.brand, product.asin].filter(Boolean).join(' · ')}
                    </Caption>
                </div>
                <AnimatedMonoNumber value={product.price} formatter={formatMoney} className="whitespace-nowrap" />
                <AnimatedMonoNumber value={product.monthly_units} formatter={formatCount} className="whitespace-nowrap" />
                <AnimatedMonoNumber value={product.monthly_revenue} formatter={formatCompactMoney} className="whitespace-nowrap text-primary" />
                <AnimatedMonoNumber value={product.net_per_unit} formatter={formatMoney} className="whitespace-nowrap text-primary" />
                <AnimatedMonoNumber value={product.fba_fee} formatter={formatMoney} className="whitespace-nowrap" />
                <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                    <Button
                        onClick={() => onCycleMark(asin, product.title ?? '')}
                        variant="ghost"
                        size="sm"
                        className={cn(
                            'h-auto rounded-full border-hairline px-2 py-0.75 text-xs whitespace-nowrap',
                            markState ? MARK_STATE_BUTTON_CLASS_NAMES[markState] : 'border-border bg-transparent text-faint',
                        )}
                    >
                        {markState ? tMark(markState) : t('productMark.unmarked')}
                    </Button>
                </div>
            </div>

            {isExpanded ? (
                <div className="border-t-hairline bg-card px-4 py-3">
                    <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-5">
                        {[
                            {
                                label: t('productStats.monthlyRevenue'),
                                value: <AnimatedMonoNumber value={product.monthly_revenue} formatter={formatCompactMoney} className="text-sm text-primary" />,
                                sub: t('productStats.unitsPerMonth', { units: formatCount(product.monthly_units) }),
                                accent: true,
                            },
                            {
                                label: t('productStats.netPerUnit'),
                                value: <AnimatedMonoNumber value={product.net_per_unit} formatter={formatMoney} className="text-sm text-primary" />,
                                sub: t('productStats.netMargin', { pct: formatMargin(product) }),
                                accent: true,
                            },
                            {
                                label: t('productStats.fbaFee'),
                                value: <AnimatedMonoNumber value={product.fba_fee} formatter={formatMoney} className="text-sm text-foreground" />,
                                sub: t('productStats.fbaDetail', {
                                    ref: formatMoney(product.referral_fee),
                                    total: formatMoney(product.total_amazon_fees),
                                }),
                            },
                            {
                                label: t('productStats.bsrRank'),
                                value: product.rank != null
                                    ? <AnimatedMonoNumber value={product.rank} formatter={formatRank} className="text-sm text-foreground" />
                                    : '—',
                                sub: t('productStats.dailyVelocity', { v: formatCount(product.daily_velocity) }),
                            },
                            {
                                label: t('productStats.package'),
                                value: <AnimatedMonoNumber value={product.pkg_weight_kg} formatter={formatWeight} className="text-sm text-foreground" />,
                                sub: formatDims(product),
                            },
                        ].map((stat) => (
                            <StatItem
                                key={stat.label}
                                label={stat.label}
                                value={stat.value}
                                sub={stat.sub}
                                accent={stat.accent}
                            />
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { label: t('productActions.open'), href: searchProductRoute(query, product.asin), primary: true },
                            { label: t('productActions.findSuppliers') },
                            { label: t('productActions.calcFees') },
                            { label: t('productActions.analyzeReviews') },
                        ].map(({ label, href, primary }) => (
                            <Button
                                key={label}
                                variant={primary ? 'primary' : 'secondary'}
                                size="sm"
                                className="h-auto rounded-md py-1.25 whitespace-nowrap"
                                href={href}
                            >
                                {label}
                            </Button>
                        ))}

                        <div className="ml-auto flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                            <Caption>{t('productMark.label')}</Caption>
                            {MARK_STATE_VALUES.map((state) => (
                                <Button
                                    key={state}
                                    onClick={() => onSetMark(asin, product.title ?? '', state)}
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        'h-auto rounded-full border-hairline px-2.5 py-1 text-xs',
                                        markState === state
                                            ? MARK_STATE_BUTTON_CLASS_NAMES[state]
                                            : 'border-border bg-transparent text-muted-foreground',
                                    )}
                                >
                                    {tMark(state)}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {markState ? (
                        <div className="mt-2 flex items-center gap-1.5">
                            <FormInput
                                value={note}
                                onChange={(event) => onNoteChange(asin, event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                placeholder={t('products.notePlaceholder')}
                                className="h-9 flex-1"
                            />
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    )
})

interface ProductsViewProps {
    products: ProductFinancial[]
    query: string
    onBack: () => void
    marketplace: string
    isJobActive: boolean
    isRefreshing: boolean
}

export function ProductsView({ products, query, onBack, marketplace, isJobActive, isRefreshing }: ProductsViewProps) {
    const [expanded, setExpanded] = useState<string | null>(null)
    const [notes, setNotes] = useState<Record<string, string>>({})
    const t = useTranslations('search')

    // Transient ref: lets handlers read the current notes without listing it
    // as a useCallback dep (rerender-use-ref-transient-values pattern).
    // useLayoutEffect syncs before any user interaction — safe for event handlers.
    const notesRef = useRef(notes)
    useLayoutEffect(() => { notesRef.current = notes })

    // All handlers are stable (empty deps). They read Zustand store state at
    // call time via getState() instead of via reactive subscription, so they
    // never become stale and never bust ProductRow.memo on parent re-renders.
    const toggle = useCallback((asin: string) => {
        setExpanded(prev => prev === asin ? null : asin)
    }, [])

    const cycleMark = useCallback((asin: string, title: string) => {
        const { markedProducts, markProduct, unmarkProduct } = useAppStore.getState()
        const current = markedProducts[asin]?.markState ?? null
        const index = MARK_STATE_CYCLE.indexOf(current)
        const next = MARK_STATE_CYCLE[(index + 1) % MARK_STATE_CYCLE.length]
        if (next === null) { unmarkProduct(asin); return }
        markProduct({ asin, name: title, markState: next, note: notesRef.current[asin] ?? '' })
    }, [])

    const setMark = useCallback((asin: string, title: string, state: MarkState) => {
        const { markProduct } = useAppStore.getState()
        markProduct({ asin, name: title, markState: state, note: notesRef.current[asin] ?? '' })
    }, [])

    const noteChange = useCallback((asin: string, value: string) => {
        setNotes(prev => ({ ...prev, [asin]: value }))
    }, [])

    if (products.length === 0) {
        return <SearchProductsSkeleton rows={8} />
    }

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <ListToolbar>
                <Button
                    onClick={onBack}
                    variant="ghost"
                    size="sm"
                    className="h-auto gap-1 p-0 text-faint hover:bg-transparent hover:text-foreground"
                    icon={<ChevronLeft size={12} />}
                >
                    {t('tabs.overview')}
                </Button>
                <Caption as="span" className="text-border">/</Caption>
                <Caption as="span" className="font-medium text-foreground">&ldquo;{query}&rdquo;</Caption>
                <Button
                    variant="secondary"
                    size="sm"
                    className="h-auto rounded-[6px] px-2.5 py-1"
                    icon={<ListFilter size={10} />}
                >
                    {t('tabs.filter')}
                </Button>
                <SearchQueryIndicator isJobActive={isJobActive} isRefreshing={isRefreshing} />
                <Mono as="span" className="ml-auto">
                    <AnimatedSpanNumber value={products.length} formatter={formatCount} /> {t('overview.productsCount')}
                </Mono>
            </ListToolbar>

            <TableHeader gridClassName="product-row-grid">
                {[t('products.colProduct'), t('products.colPrice'), t('products.colUnits'), t('products.colRevenue'), t('products.colNet'), t('products.colFee'), t('products.colMark')].map((header) => (
                    <TableHeaderCell key={header}>{header}</TableHeaderCell>
                ))}
            </TableHeader>

            <div className="flex-1 overflow-y-auto bg-background">
                {products.map((product) => (
                    <ProductRow
                        key={product.asin ?? product.title ?? 'product-row'}
                        product={product}
                        isExpanded={expanded === product.asin}
                        onToggle={toggle}
                        marketplace={marketplace}
                        query={query}
                        note={notes[product.asin ?? ''] ?? ''}
                        onCycleMark={cycleMark}
                        onSetMark={setMark}
                        onNoteChange={noteChange}
                    />
                ))}
            </div>
        </div>
    )
}