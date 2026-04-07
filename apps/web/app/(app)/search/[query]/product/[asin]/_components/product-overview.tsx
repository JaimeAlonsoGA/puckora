'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import type { Route } from 'next'
import { ChevronLeft } from 'lucide-react'
import {
    Badge,
    Button,
    Caption,
    DataCard,
    KpiCard,
    ListToolbar,
    Mono,
    StatItem,
    Subheading,
} from '@puckora/ui'
import type { ProductFinancial } from '@puckora/types'
import {
    formatCompactMoney,
    formatCount,
    formatMoney,
    formatRank,
    formatRating,
    formatScaledPercent,
    formatWeight,
} from '@puckora/utils'
import { useAppStore } from '@/lib/store'
import {
    MARK_STATE_VALUES,
    MARK_STATE_BADGE_VARIANTS,
    MARK_STATE_BUTTON_CLASS_NAMES,
    type MarkState,
} from '@/constants/app-state'
import { searchQueryRoute } from '@/constants/routes'
import { getMarketplaceProductUrl } from '@/app/(app)/search/[query]/_components/search-view-helpers'
import { AnimatedMonoNumber } from '@/app/(app)/search/[query]/_components/search-live-animations'

// ─── Not found state ──────────────────────────────────────────────────────────

// ─── Main overview ──────────────────────────────────────────────────────────

interface ProductOverviewProps {
    product: ProductFinancial
    query: string
    marketplace: string
}

export function ProductOverview({ product, query, marketplace }: ProductOverviewProps) {
    const t = useTranslations('product')
    const tMark = useTranslations('mark')

    // Derive a guaranteed non-null asin string — the view column is nullable but
    // the page URL always carries a concrete ASIN value.
    const asin = product.asin ?? ''

    // Per-row mark state selector
    const markState = useAppStore((s) => s.markedProducts[asin]?.markState ?? null)
    const [note, setNote] = useState<string>(() => useAppStore.getState().markedProducts[asin]?.note ?? '')

    // Transient refs so callbacks have empty deps and never bust memo
    const noteRef = useRef(note)
    useLayoutEffect(() => { noteRef.current = note })
    const markStateRef = useRef<MarkState | null>(markState)
    useLayoutEffect(() => { markStateRef.current = markState })

    const handleMark = useCallback((state: MarkState) => {
        const { markedProducts, markProduct, unmarkProduct } = useAppStore.getState()
        const current = markedProducts[asin]?.markState ?? null
        if (current === state) {
            unmarkProduct(asin)
        } else {
            markProduct({ asin, name: product.title ?? asin, markState: state, note: noteRef.current })
        }
    }, [asin, product.title])

    const handleNoteChange = useCallback((value: string) => {
        setNote(value)
        const { markProduct } = useAppStore.getState()
        if (markStateRef.current) {
            markProduct({ asin, name: product.title ?? asin, markState: markStateRef.current, note: value })
        }
    }, [asin, product.title])

    const amazonUrl = getMarketplaceProductUrl(marketplace, asin)
    const backRoute = searchQueryRoute(query) as Route
    const ageMonths = product.product_age_months

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            {/* Toolbar */}
            <ListToolbar>
                <Button
                    href={backRoute}
                    variant="ghost"
                    size="sm"
                    icon={<ChevronLeft size={14} aria-hidden="true" />}
                >
                    {t('nav.backTo', { keyword: query })}
                </Button>
            </ListToolbar>

            <div className="flex flex-col gap-5 p-4 w-full mx-auto pb-16">

                {/* Header */}
                <div className="flex gap-4 items-start">
                    {product.main_image_url && (
                        <Link href={amazonUrl as Route} target="_blank" rel="noreferrer" className="shrink-0">
                            <Image
                                src={product.main_image_url}
                                alt={product.title ?? asin}
                                width={96}
                                height={96}
                                className="rounded-md object-contain bg-card border-hairline"
                            />
                        </Link>
                    )}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <Subheading className="leading-snug line-clamp-2">
                            {product.title ?? asin}
                        </Subheading>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                            {product.brand && (
                                <Caption className="text-muted-foreground">{product.brand}</Caption>
                            )}
                            <Caption className="text-faint font-mono">{asin}</Caption>
                            {markState && (
                                <Badge variant={MARK_STATE_BADGE_VARIANTS[markState]} size="sm">
                                    {tMark(markState)}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Button href={amazonUrl} variant="ghost" size="sm" className="shrink-0 hidden sm:flex">
                        {t('actions.openOnAmazon')}
                    </Button>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <KpiCard
                        label={t('hero.price')}
                        value={<AnimatedMonoNumber value={product.price} formatter={formatMoney} />}
                    />
                    <KpiCard
                        label={t('hero.revenue')}
                        value={<AnimatedMonoNumber value={product.monthly_revenue} formatter={formatCompactMoney} />}
                    />
                    <KpiCard
                        label={t('hero.net')}
                        value={<AnimatedMonoNumber value={product.net_per_unit} formatter={formatMoney} />}
                    />
                    <KpiCard
                        label={t('hero.fbaFee')}
                        value={<AnimatedMonoNumber value={product.fba_fee} formatter={formatMoney} />}
                    />
                </div>

                {/* Detail row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Amazon Economics */}
                    <DataCard title={t('economics.title')}>
                        <div className="flex flex-col gap-2">
                            <StatItem
                                label={t('economics.fbaFee')}
                                value={<AnimatedMonoNumber value={product.fba_fee} formatter={formatMoney} />}
                            />
                            <StatItem
                                label={t('economics.referralFee')}
                                value={<AnimatedMonoNumber value={product.referral_fee} formatter={formatMoney} />}
                            />
                            <StatItem
                                label={t('economics.amazonTakes')}
                                value={<AnimatedMonoNumber
                                    value={product.amazon_fee_pct}
                                    formatter={formatScaledPercent}
                                />}
                            />
                            {product.pkg_weight_kg != null && (
                                <StatItem
                                    label={t('logistics.weight')}
                                    value={<Mono className="text-sm">{formatWeight(product.pkg_weight_kg)}</Mono>}
                                />
                            )}
                        </div>
                    </DataCard>

                    {/* Market Position */}
                    <DataCard title={t('position.title')}>
                        <div className="flex flex-col gap-2">
                            <StatItem
                                label={t('position.bsrRank')}
                                value={
                                    <AnimatedMonoNumber
                                        value={product.rank}
                                        formatter={formatRank}
                                    />
                                }
                            />
                            <StatItem
                                label={t('position.dailyVelocity')}
                                value={
                                    <AnimatedMonoNumber
                                        value={product.daily_velocity}
                                        formatter={(v) => v != null ? t('position.velocityUnits', { count: formatCount(v) }) : '—'}
                                    />
                                }
                            />
                            <StatItem
                                label={t('position.rating')}
                                value={<Mono className="text-sm">{formatRating(product.rating)}</Mono>}
                            />
                            <StatItem
                                label={t('position.reviewCount')}
                                value={<AnimatedMonoNumber value={product.review_count} formatter={formatCount} />}
                            />
                            {ageMonths != null && (
                                <StatItem
                                    label={t('logistics.listingAge')}
                                    value={<Mono className="text-sm">{t('logistics.listingAgeMonths', { months: ageMonths })}</Mono>}
                                />
                            )}
                        </div>
                    </DataCard>
                </div>

                {/* Package card */}
                {(product.pkg_weight_kg != null || product.pkg_length_cm != null) && (
                    <DataCard title={t('logistics.title')}>
                        <div className="flex flex-wrap gap-6">
                            {product.pkg_weight_kg != null && (
                                <StatItem
                                    label={t('logistics.weight')}
                                    value={<Mono className="text-sm">{formatWeight(product.pkg_weight_kg)}</Mono>}
                                />
                            )}
                            {product.pkg_length_cm != null && product.pkg_width_cm != null && product.pkg_height_cm != null && (
                                <StatItem
                                    label={t('logistics.dims')}
                                    value={
                                        <Mono className="text-sm">
                                            {t('logistics.dimsValue', {
                                                l: product.pkg_length_cm.toFixed(1),
                                                w: product.pkg_width_cm.toFixed(1),
                                                h: product.pkg_height_cm.toFixed(1),
                                            })}
                                        </Mono>
                                    }
                                />
                            )}
                        </div>
                    </DataCard>
                )}

                {/* Research status (mark + notes) */}
                <DataCard title={t('research.section')}>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                            {MARK_STATE_VALUES.map((state) => {
                                const isActive = markState === state
                                return (
                                    <button
                                        key={state}
                                        type="button"
                                        onClick={() => handleMark(state)}
                                        className={[
                                            'h-8 rounded-md px-3 text-sm border transition-colors',
                                            isActive
                                                ? MARK_STATE_BUTTON_CLASS_NAMES[state]
                                                : 'bg-background text-faint border-border hover:border-border-strong',
                                        ].join(' ')}
                                    >
                                        {tMark(state)}
                                    </button>
                                )
                            })}
                        </div>
                        {markState && (
                            <textarea
                                value={note}
                                onChange={(e) => handleNoteChange(e.target.value)}
                                placeholder={t('research.notePlaceholder')}
                                rows={3}
                                className="w-full rounded-md bg-card border-hairline px-3 py-2 text-sm text-foreground placeholder:text-faint resize-none focus:outline-none focus:border-border-focus"
                            />
                        )}
                    </div>
                </DataCard>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                    <Button href={amazonUrl} variant="secondary" size="sm">
                        {t('actions.openOnAmazon')}
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                        {t('actions.findSuppliers')}
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                        {t('actions.calcFees')}
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                        {t('actions.analyzeReviews')}
                    </Button>
                </div>

            </div>
        </div>
    )
}
