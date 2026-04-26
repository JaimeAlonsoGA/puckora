'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import type { Route } from 'next'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
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
import type { ProductFinancial, AmazonProduct } from '@puckora/types'
import {
    formatCompactMoney,
    formatCount,
    formatDeductMoney,
    formatDims,
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
import { AppRoute, searchQueryRoute } from '@/constants/routes'
import { buildAmazonProductUrl } from '@/constants/amazon-marketplace'
import { AnimatedMonoNumber } from '@/components/shared/animated-numbers'
import { FormTextarea } from '@/components/form'
import {
    CertificationSignals,
    getCertificationEntries,
} from '@/app/(app)/search/_components/certification-signals'
import { Package3D } from './package-box-3d'

// ─── Star rating display ──────────────────────────────────────────────────────

function StarRating({ value }: { value: number | null | undefined }) {
    if (value == null) return <Mono className="text-sm">—</Mono>
    const full = Math.floor(value)
    const hasHalf = value - full >= 0.25 && value - full < 0.75
    const empty = 5 - full - (hasHalf ? 1 : 0)
    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: full }).map((_, i) => (
                <Star key={`f${i}`} size={12} className="fill-amber-400 text-amber-400" aria-hidden="true" />
            ))}
            {hasHalf && <Star size={12} className="fill-amber-400/50 text-amber-400" aria-hidden="true" />}
            {Array.from({ length: empty }).map((_, i) => (
                <Star key={`e${i}`} size={12} className="text-muted-foreground" aria-hidden="true" />
            ))}
            <Mono className="text-xs ml-0.5 text-muted-foreground">{value.toFixed(1)}</Mono>
        </div>
    )
}

// ─── Category breadcrumb ──────────────────────────────────────────────────────

function CategoryBreadcrumb({ path }: { path: string | null }) {
    if (!path) return null
    const segments = path.split('>').map((s) => s.trim()).filter(Boolean)
    return (
        <div className="flex flex-wrap items-center gap-0.5">
            {segments.map((seg, i) => (
                <span key={i} className="flex items-center gap-0.5 text-xs text-faint">
                    {i > 0 && <ChevronRight size={10} aria-hidden="true" />}
                    <span>{seg}</span>
                </span>
            ))}
        </div>
    )
}

// ─── Main overview ────────────────────────────────────────────────────────────

interface ProductOverviewProps {
    product: ProductFinancial
    rawProduct: AmazonProduct | null
    query: string | null
    marketplace: string
}

export function ProductOverview({ product, rawProduct, query, marketplace }: ProductOverviewProps) {
    const t = useTranslations('product')
    const tMark = useTranslations('mark')

    const asin = product.asin ?? ''

    const markState = useAppStore((s) => s.markedProducts[asin]?.markState ?? null)
    const [note, setNote] = useState<string>(() => useAppStore.getState().markedProducts[asin]?.note ?? '')

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

    const amazonUrl = buildAmazonProductUrl(marketplace, asin)
    const backRoute = (query ? searchQueryRoute(query) : AppRoute.search) as Route

    const isFba = product.fba_fee != null && product.fba_fee > 0
    const hasDims = (
        product.pkg_length_cm != null &&
        product.pkg_width_cm != null &&
        product.pkg_height_cm != null
    )

    const certificationEntries = getCertificationEntries([product.category_path])

    const bullets: string[] = rawProduct?.bullet_points ?? []
    const manufacturer = rawProduct?.manufacturer ?? null

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
                    {query ? t('nav.backTo', { keyword: query }) : t('nav.backToResults')}
                </Button>
                <div className="ml-auto flex items-center gap-2">
                    {isFba
                        ? <Badge variant="info" size="sm">{t('logistics.fulfilmentFba')}</Badge>
                        : <Badge variant="default" size="sm">{t('logistics.fulfilmentFbm')}</Badge>
                    }
                    <Button href={amazonUrl} variant="ghost" size="sm" className="hidden sm:flex">
                        {t('actions.openOnAmazon')}
                    </Button>
                </div>
            </ListToolbar>

            <div className="flex flex-col gap-5 p-4 pb-16">

                {/* Header: image + title + brand + ASIN + category */}
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
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                        <Subheading className="leading-snug line-clamp-3">
                            {product.title ?? asin}
                        </Subheading>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {product.brand && (
                                <Caption className="text-muted-foreground font-medium">{product.brand}</Caption>
                            )}
                            {manufacturer && manufacturer !== product.brand && (
                                <Caption className="text-faint">{manufacturer}</Caption>
                            )}
                            <Caption className="font-mono text-faint">{asin}</Caption>
                            {markState && (
                                <Badge variant={MARK_STATE_BADGE_VARIANTS[markState]} size="sm">
                                    {tMark(markState)}
                                </Badge>
                            )}
                        </div>
                        <CategoryBreadcrumb path={product.category_path ?? null} />
                    </div>
                </div>

                {/* KPI row: price, rating, reviews, daily sales, monthly revenue, net/unit */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    <KpiCard
                        label={t('hero.price')}
                        value={<AnimatedMonoNumber value={product.price} formatter={formatMoney} />}
                    />
                    <KpiCard
                        label={t('hero.rating')}
                        value={<StarRating value={product.rating} />}
                    />
                    <KpiCard
                        label={t('hero.reviews')}
                        value={<AnimatedMonoNumber value={product.review_count} formatter={formatCount} />}
                    />
                    <KpiCard
                        label={t('hero.dailySales')}
                        value={
                            <AnimatedMonoNumber
                                value={product.daily_velocity}
                                formatter={(v) => v != null ? `${formatCount(v)}/day` : '—'}
                            />
                        }
                    />
                    <KpiCard
                        label={t('hero.revenue')}
                        value={<AnimatedMonoNumber value={product.monthly_revenue} formatter={formatCompactMoney} />}
                    />
                    <KpiCard
                        label={t('hero.net')}
                        value={
                            <AnimatedMonoNumber
                                value={product.net_per_unit}
                                formatter={formatMoney}
                            />
                        }
                        valueClassName={
                            product.net_per_unit != null && product.net_per_unit > 0
                                ? 'text-green-400'
                                : product.net_per_unit != null && product.net_per_unit < 0
                                    ? 'text-red-400'
                                    : undefined
                        }
                    />
                </div>

                {/* Detail row: economics + market position */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    {/* Amazon Economics */}
                    <DataCard title={t('economics.title')}>
                        <div className="flex flex-col gap-2">
                            <StatItem
                                label={t('economics.price')}
                                value={<AnimatedMonoNumber value={product.price} formatter={formatMoney} />}
                            />
                            <StatItem
                                label={t('economics.fbaFee')}
                                value={<AnimatedMonoNumber value={product.fba_fee} formatter={formatDeductMoney} />}
                            />
                            <StatItem
                                label={t('economics.referralFee')}
                                value={<AnimatedMonoNumber value={product.referral_fee} formatter={formatDeductMoney} />}
                            />
                            <StatItem
                                label={t('economics.amazonTakes')}
                                value={
                                    <AnimatedMonoNumber
                                        value={product.amazon_fee_pct}
                                        formatter={formatScaledPercent}
                                    />
                                }
                            />
                            <div className="h-px bg-border my-0.5" />
                            <StatItem
                                label={t('economics.netPerUnit')}
                                value={
                                    <Mono className={[
                                        'text-sm',
                                        product.net_per_unit != null && product.net_per_unit > 0
                                            ? 'text-green-400'
                                            : 'text-muted-foreground',
                                    ].join(' ')}>
                                        {formatMoney(product.net_per_unit)}
                                    </Mono>
                                }
                            />
                            {manufacturer && (
                                <StatItem
                                    label={t('meta.manufacturer')}
                                    value={<Caption className="text-muted-foreground">{manufacturer}</Caption>}
                                />
                            )}
                        </div>
                    </DataCard>

                    {/* Market Position */}
                    <DataCard title={t('position.title')}>
                        <div className="flex flex-col gap-2">
                            <StatItem
                                label={t('position.bsrRank')}
                                value={<AnimatedMonoNumber value={product.rank} formatter={formatRank} />}
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
                                label={t('position.monthlyRevenue')}
                                value={
                                    <AnimatedMonoNumber
                                        value={product.monthly_revenue}
                                        formatter={formatCompactMoney}
                                    />
                                }
                            />
                            {product.bought_past_month != null && (
                                <StatItem
                                    label={t('position.bought')}
                                    value={
                                        <AnimatedMonoNumber
                                            value={product.bought_past_month}
                                            formatter={(v) => v != null ? `${formatCount(v)}+` : '—'}
                                        />
                                    }
                                />
                            )}
                            <StatItem
                                label={t('position.rating')}
                                value={<Mono className="text-sm">{formatRating(product.rating)}</Mono>}
                            />
                            <StatItem
                                label={t('position.reviewCount')}
                                value={<AnimatedMonoNumber value={product.review_count} formatter={formatCount} />}
                            />
                            {product.product_age_months != null && (
                                <StatItem
                                    label={t('logistics.listingAge')}
                                    value={
                                        <Mono className="text-sm">
                                            {t('logistics.listingAgeMonths', { months: product.product_age_months })}
                                        </Mono>
                                    }
                                />
                            )}
                        </div>
                    </DataCard>
                </div>

                {/* Package & Logistics with 3D visualization */}
                {(hasDims || product.pkg_weight_kg != null) && (
                    <DataCard title={t('logistics.title')}>
                        <div className="flex flex-wrap items-start gap-8">
                            {hasDims && (
                                <div className="flex flex-col items-center gap-2">
                                    <Package3D
                                        lengthCm={product.pkg_length_cm!}
                                        widthCm={product.pkg_width_cm!}
                                        heightCm={product.pkg_height_cm!}
                                    />
                                    <Caption className="text-faint text-center">
                                        {t('logistics.dimsValue', {
                                            l: product.pkg_length_cm!.toFixed(1),
                                            w: product.pkg_width_cm!.toFixed(1),
                                            h: product.pkg_height_cm!.toFixed(1),
                                        })}
                                    </Caption>
                                </div>
                            )}
                            <div className="flex flex-col gap-2">
                                {product.pkg_weight_kg != null && (
                                    <StatItem
                                        label={t('logistics.weight')}
                                        value={<Mono className="text-sm">{formatWeight(product.pkg_weight_kg)}</Mono>}
                                    />
                                )}
                                {hasDims && (
                                    <StatItem
                                        label={t('logistics.dims')}
                                        value={<Mono className="text-sm">{formatDims(product)}</Mono>}
                                    />
                                )}
                                <StatItem
                                    label={t('logistics.fulfilment')}
                                    value={
                                        isFba
                                            ? <Badge variant="info" size="sm">{t('logistics.fulfilmentFba')}</Badge>
                                            : <Badge variant="default" size="sm">{t('logistics.fulfilmentFbm')}</Badge>
                                    }
                                />
                            </div>
                        </div>
                    </DataCard>
                )}

                {/* Certifications */}
                {certificationEntries.length > 0 && (
                    <DataCard title={t('certifications.title')}>
                        <CertificationSignals entries={certificationEntries} maxEntries={1} />
                    </DataCard>
                )}

                {/* Product details (bullet points) */}
                {bullets.length > 0 && (
                    <DataCard title={t('bullets.title')}>
                        <ul className="flex flex-col gap-1.5">
                            {bullets.map((point, i) => (
                                <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-snug">
                                    <span className="mt-1 shrink-0 text-faint">•</span>
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </DataCard>
                )}

                {/* Research status (mark + notes) */}
                <DataCard title={t('research.section')}>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                            {MARK_STATE_VALUES.map((state) => {
                                const isActive = markState === state
                                return (
                                    <Button
                                        key={state}
                                        type="button"
                                        onClick={() => handleMark(state)}
                                        variant="ghost"
                                        size="sm"
                                        className={[
                                            'h-8 rounded-md px-3 text-sm border transition-colors',
                                            isActive
                                                ? MARK_STATE_BUTTON_CLASS_NAMES[state]
                                                : 'bg-background text-faint border-border hover:border-border-strong',
                                        ].join(' ')}
                                    >
                                        {tMark(state)}
                                    </Button>
                                )
                            })}
                        </div>
                        {markState && (
                            <FormTextarea
                                value={note}
                                onChange={(e) => handleNoteChange(e.target.value)}
                                placeholder={t('research.notePlaceholder')}
                                rows={3}
                                className="min-h-24 resize-none bg-card px-3 py-2 text-sm"
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
