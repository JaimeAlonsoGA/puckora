'use client'

import { useState } from 'react'
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
    formatWeight,
} from '@puckora/utils'
import { SearchProductsSkeleton } from '@/app/(app)/search/_components/search-skeletons'
import { getMarketplaceProductUrl } from './search-view-helpers'

interface ProductRowProps {
    product: ProductFinancial
    isExpanded: boolean
    onToggle: () => void
    marketplace: string
    markState: MarkState | null
    onCycleMark: () => void
    onSetMark: (state: MarkState) => void
    note: string
    onNoteChange: (value: string) => void
}

function ProductRow({
    product,
    isExpanded,
    onToggle,
    marketplace,
    markState,
    onCycleMark,
    onSetMark,
    note,
    onNoteChange,
}: ProductRowProps) {
    const t = useTranslations('search')

    return (
        <div className="border-b-hairline">
            <div
                onClick={onToggle}
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
                <Mono as="span" className="whitespace-nowrap">{formatMoney(product.price)}</Mono>
                <Mono as="span" className="whitespace-nowrap">{formatCount(product.monthly_units)}</Mono>
                <Mono as="span" className="whitespace-nowrap text-primary">{formatCompactMoney(product.monthly_revenue)}</Mono>
                <Mono as="span" className="whitespace-nowrap text-primary">{formatMoney(product.net_per_unit)}</Mono>
                <Mono as="span" className="whitespace-nowrap">{formatMoney(product.fba_fee)}</Mono>
                <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                    <Button
                        onClick={onCycleMark}
                        variant="ghost"
                        size="sm"
                        className={cn(
                            'h-auto rounded-full border-[0.5px] px-2 py-0.75 text-xs whitespace-nowrap',
                            markState ? MARK_STATE_BUTTON_CLASS_NAMES[markState] : 'border-border bg-transparent text-faint',
                        )}
                    >
                        {markState ?? t('productMark')}
                    </Button>
                </div>
            </div>

            {isExpanded ? (
                <div className="border-t-hairline bg-card px-4 py-3">
                    <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-5">
                        {[
                            {
                                label: t('productStats_monthlyRevenue'),
                                value: formatCompactMoney(product.monthly_revenue),
                                sub: t('productStats_unitsPerMonth', { units: formatCount(product.monthly_units) }),
                                accent: true,
                            },
                            {
                                label: t('productStats_netPerUnit'),
                                value: formatMoney(product.net_per_unit),
                                sub: t('productStats_netMargin', { pct: formatMargin(product) }),
                                accent: true,
                            },
                            {
                                label: t('productStats_fbaFee'),
                                value: formatMoney(product.fba_fee),
                                sub: t('productStats_fbaDetail', {
                                    ref: formatMoney(product.referral_fee),
                                    total: formatMoney(product.total_amazon_fees),
                                }),
                            },
                            {
                                label: t('productStats_bsrRank'),
                                value: product.rank != null ? `#${formatCount(product.rank)}` : '—',
                                sub: t('productStats_dailyVelocity', { v: formatCount(product.daily_velocity) }),
                            },
                            {
                                label: t('productStats_package'),
                                value: formatWeight(product.pkg_weight_kg),
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
                            { label: t('productActions_open'), href: getMarketplaceProductUrl(marketplace, product.asin), primary: true },
                            { label: t('productActions_findSuppliers') },
                            { label: t('productActions_calcFees') },
                            { label: t('productActions_analyzeReviews') },
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
                            <Caption>{t('productMarkAs')}</Caption>
                            {MARK_STATE_VALUES.map((state) => (
                                <Button
                                    key={state}
                                    onClick={() => onSetMark(state)}
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        'h-auto rounded-full border-[0.5px] px-2.5 py-1 text-xs',
                                        markState === state
                                            ? MARK_STATE_BUTTON_CLASS_NAMES[state]
                                            : 'border-border bg-transparent text-muted-foreground',
                                    )}
                                >
                                    {state}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {markState ? (
                        <div className="mt-2 flex items-center gap-1.5">
                            <FormInput
                                value={note}
                                onChange={(event) => onNoteChange(event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                placeholder={t('productNotePlaceholder')}
                                className="h-9 flex-1"
                            />
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    )
}

interface ProductsViewProps {
    products: ProductFinancial[]
    query: string
    onBack: () => void
    marketplace: string
}

export function ProductsView({ products, query, onBack, marketplace }: ProductsViewProps) {
    const [expanded, setExpanded] = useState<string | null>(null)
    const [notes, setNotes] = useState<Record<string, string>>({})
    const t = useTranslations('search')
    const { markedProducts, markProduct, unmarkProduct } = useAppStore()

    if (products.length === 0) {
        return <SearchProductsSkeleton rows={8} />
    }

    function cycleMark(product: ProductFinancial) {
        const asin = product.asin ?? ''
        const current = markedProducts[asin]?.markState ?? null
        const index = MARK_STATE_CYCLE.indexOf(current)
        const next = MARK_STATE_CYCLE[(index + 1) % MARK_STATE_CYCLE.length]

        if (next === null) {
            unmarkProduct(asin)
            return
        }

        markProduct({ asin, name: product.title ?? '', markState: next, note: notes[asin] })
    }

    function setMark(product: ProductFinancial, state: MarkState) {
        const asin = product.asin ?? ''
        markProduct({ asin, name: product.title ?? '', markState: state, note: notes[asin] })
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
                    {formatCount(products.length)} {t('productsCount')}
                </Mono>
            </ListToolbar>

            <TableHeader gridClassName="product-row-grid">
                {[t('colProduct'), t('colPrice'), t('colUnits'), t('colRevenue'), t('colNet'), t('colFee'), t('colMark')].map((header) => (
                    <TableHeaderCell key={header}>{header}</TableHeaderCell>
                ))}
            </TableHeader>

            <div className="flex-1 overflow-y-auto bg-background">
                {products.map((product) => (
                    <ProductRow
                        key={product.asin ?? product.title ?? 'product-row'}
                        product={product}
                        isExpanded={expanded === product.asin}
                        onToggle={() => setExpanded(expanded === (product.asin ?? '') ? null : (product.asin ?? ''))}
                        marketplace={marketplace}
                        markState={markedProducts[product.asin ?? '']?.markState ?? null}
                        onCycleMark={() => cycleMark(product)}
                        onSetMark={(state) => setMark(product, state)}
                        note={notes[product.asin ?? ''] ?? ''}
                        onNoteChange={(value) => setNotes((previous) => ({ ...previous, [product.asin ?? '']: value }))}
                    />
                ))}
            </div>
        </div>
    )
}