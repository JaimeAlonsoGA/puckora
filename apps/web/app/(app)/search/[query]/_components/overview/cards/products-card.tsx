'use client'

import { memo, useCallback, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Bookmark, ChevronDown, ChevronRight, ImageIcon, LayoutGrid, LayoutList, Star } from 'lucide-react'
import { Button, Caption, DataCard, TableHeader, TableHeaderCell, TextLink } from '@puckora/ui'
import {
    cn,
    formatCount,
    formatMoney,
    formatRating,
    formatWeight,
} from '@puckora/utils'
import type { ProductFinancial } from '@puckora/types'
import type { SearchDataAvailability } from '@/types/search'
import { searchProductRoute } from '@/constants/routes'
import { MARK_STATES } from '@/constants/app-state'
import { useAppStore } from '@/lib/store'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'
import { getSearchProductRowKey } from '../../search-overview-helpers'
import { CardViewToggle } from './card-view-toggle'

const SKELETON_COUNT = 9
// Shared grid template — header + rows must match
const ROW_GRID = 'grid-cols-[14px_1fr_68px_100px_52px_88px_64px]'

const PRODUCTS_CARD_VIEW_IDS = {
    GRID: 'grid',
    TABLE: 'table',
} as const

type ProductsCardViewId = (typeof PRODUCTS_CARD_VIEW_IDS)[keyof typeof PRODUCTS_CARD_VIEW_IDS]

const PRODUCTS_CARD_VIEW_OPTIONS = [
    {
        value: PRODUCTS_CARD_VIEW_IDS.GRID,
        icon: <LayoutGrid aria-hidden="true" className="size-3.5" />,
    },
    {
        value: PRODUCTS_CARD_VIEW_IDS.TABLE,
        icon: <LayoutList aria-hidden="true" className="size-3.5" />,
    },
] as const

interface TopProductsCardProps {
    products: ProductFinancial[]
    availability: SearchDataAvailability
}

interface ProductRowProps {
    rowKey: string
    product: ProductFinancial
    isExpanded: boolean
    onToggle: (rowKey: string) => void
    onBookmark: (asin: string, title: string) => void
}

const ProductRow = memo(function ProductRow({
    rowKey,
    product,
    isExpanded,
    onToggle,
    onBookmark,
}: ProductRowProps) {
    const t = useTranslations('search')
    const asin = product.asin
    const rev = Number(product.monthly_revenue ?? 0)
    const net = Number(product.net_per_unit ?? 0)
    const vel = Number(product.daily_velocity ?? 0)
    const isBookmarked = useAppStore((state) => (asin ? Boolean(state.markedProducts[asin]) : false))

    return (
        <>
            {/* Layer 1 — always visible */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => onToggle(rowKey)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(rowKey) }}
                className={cn(
                    'grid items-center gap-2 px-3 py-1.5 cursor-pointer select-none transition-colors',
                    'border-b-hairline hover:bg-card',
                    ROW_GRID,
                    isExpanded && 'bg-card',

                )}
            >
                {isExpanded
                    ? <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                    : <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                }

                {/* Image + title */}
                <div className="flex items-center gap-2 min-w-0">
                    {product.main_image_url ? (
                        <Image
                            src={product.main_image_url}
                            alt={product.title ?? ''}
                            width={28}
                            height={28}
                            className="size-7 shrink-0 rounded-sm object-cover bg-muted"
                        />
                    ) : (
                        <div className="size-7 shrink-0 rounded-sm bg-muted flex items-center justify-center">
                            <ImageIcon aria-hidden="true" className="size-3 text-muted-foreground" />
                        </div>
                    )}
                    <Caption className="truncate text-foreground">{product.title ?? asin}</Caption>
                </div>

                {/* Price */}
                <Caption className="tabular-nums text-right">{formatMoney(product.price)}</Caption>

                {/* Rating + reviews */}
                <div className="flex items-center gap-0.5 min-w-0">
                    <Star aria-hidden="true" className="size-3 fill-amber-400 text-amber-400 shrink-0" />
                    <Caption className="tabular-nums shrink-0">{formatRating(product.rating)}</Caption>
                    <Caption className="text-muted-foreground tabular-nums truncate">({formatCount(product.review_count)})</Caption>
                </div>

                {/* Daily velocity */}
                <Caption className="tabular-nums text-muted-foreground text-right">
                    {vel > 0 ? `${formatCount(vel)}/d` : '—'}
                </Caption>

                {/* Monthly revenue */}
                <Caption className="tabular-nums font-medium text-right">
                    {rev > 0 ? formatMoney(rev) : '—'}
                </Caption>

                {/* Net/unit */}
                <Caption className={cn(
                    'tabular-nums text-right',
                    net > 0 ? 'text-success-fg' : net < 0 ? 'text-error-fg' : 'text-muted-foreground',
                )}>
                    {net !== 0 ? formatMoney(net) : '—'}
                </Caption>
            </div>

            {/* Layer 2 — expanded detail */}
            {isExpanded && (
                <div className="bg-muted px-8 py-2 grid grid-flow-col-dense items-center gap-y-1 border-b-hairline">
                    {product.brand && (
                        <span className="flex items-center gap-1.5">
                            <Caption className="text-muted-foreground">{t('products.metaBrand')}</Caption>
                            <Caption className="text-foreground">{product.brand}</Caption>
                        </span>
                    )}
                    {product.pkg_weight_kg != null && (
                        <span className="flex items-center gap-1.5">
                            <Caption className="text-muted-foreground">{t('products.metaWeight')}</Caption>
                            <Caption>{formatWeight(product.pkg_weight_kg)}</Caption>
                        </span>
                    )}
                    {product.fba_fee != null && (
                        <span className="flex items-center gap-1.5">
                            <Caption className="text-muted-foreground">{t('products.metaFba')}</Caption>
                            <Caption>{formatMoney(product.fba_fee)}</Caption>
                        </span>
                    )}
                    {product.referral_fee != null && (
                        <span className="flex items-center gap-1.5">
                            <Caption className="text-muted-foreground">{t('products.metaReferral')}</Caption>
                            <Caption>{formatMoney(product.referral_fee)}</Caption>
                        </span>
                    )}
                    <span className="flex items-center gap-1.5">
                        {asin && (
                            <TextLink
                                href={searchProductRoute(asin)}
                                underline="hover"
                            >
                                {t('products.viewProduct')}
                            </TextLink>
                        )}
                        {asin ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    'h-6 w-6 p-0 shrink-0',
                                    isBookmarked && 'text-primary',
                                )}
                                onClick={() => onBookmark(asin, product.title ?? asin)}
                            >
                                <Bookmark
                                    aria-hidden="true"
                                    className={cn('size-3.5', isBookmarked && 'fill-primary')}
                                />
                            </Button>
                        ) : null}
                    </span>
                </div>
            )}
        </>
    )
})

export function ProductsCard({ products, availability }: TopProductsCardProps) {
    const t = useTranslations('search')
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.PRODUCT_IMAGES)
    const [view, setView] = useState<ProductsCardViewId>(PRODUCTS_CARD_VIEW_IDS.GRID)
    const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null)

    // Stable handler — functional update, no deps
    const handleToggle = useCallback((rowKey: string) => {
        setExpandedRowKey((prev) => (prev === rowKey ? null : rowKey))
    }, [])

    // Stable bookmark toggle — reads store state at call time, never stale
    const handleBookmark = useCallback((asin: string, title: string) => {
        const { markedProducts, markProduct, unmarkProduct } = useAppStore.getState()
        if (markedProducts[asin]) {
            unmarkProduct(asin)
        } else {
            markProduct({ asin, name: title, markState: MARK_STATES.INTERESTED })
        }
    }, [])

    if (!availability.hasFinancials) {
        return (
            <DataCard title={t('images.card')} className="flex-1 min-h-0" {...tutorial}>
                <div className="grid grid-rows-3 grid-flow-col auto-cols-[155px] gap-1.5">
                    {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                        <div key={i} className="h-36 animate-pulse rounded-sm bg-muted" />
                    ))}
                </div>
            </DataCard>
        )
    }

    const withImages = products.filter(
        (p): p is ProductFinancial & { asin: string; main_image_url: string } =>
            p.asin != null && p.main_image_url != null,
    )

    // Products sorted by revenue desc for table view
    const sortedProducts = [...products].sort(
        (a, b) => Number(b.monthly_revenue ?? 0) - Number(a.monthly_revenue ?? 0),
    )

    if (view === PRODUCTS_CARD_VIEW_IDS.GRID && withImages.length === 0) return null

    return (
        <DataCard
            title={t('images.card')}
            className="flex-1 min-h-0"
            headerAction={
                <CardViewToggle
                    options={PRODUCTS_CARD_VIEW_OPTIONS}
                    value={view}
                    onChange={setView}
                />
            }
            {...tutorial}
        >
            <div className="flex flex-col gap-2">
                {view === PRODUCTS_CARD_VIEW_IDS.GRID ? (
                    /* Grid view — image rail */
                    <div className="grid grid-rows-3 grid-flow-col auto-cols-[155px] gap-1.5 overflow-x-auto pb-1">
                        {withImages.map((product) => (
                            <Link
                                key={product.asin}
                                href={searchProductRoute(product.asin)}
                                className="group relative h-36 overflow-hidden rounded-sm bg-muted"
                                aria-label={product.title ?? product.asin}
                            >
                                <Image
                                    src={product.main_image_url}
                                    alt={product.title ?? ''}
                                    fill
                                    sizes="155px"
                                    className="object-cover transition-opacity group-hover:opacity-80"
                                />
                            </Link>
                        ))}
                    </div>
                ) : (
                    /* Table view — two-layer expandable rows */
                    <div className="flex flex-col overflow-x-auto">
                        <TableHeader gridClassName={ROW_GRID}>
                            <div />
                            <TableHeaderCell>{t('products.colProduct')}</TableHeaderCell>
                            <TableHeaderCell className="justify-end">{t('products.colPrice')}</TableHeaderCell>
                            <TableHeaderCell>{t('rating.card')}</TableHeaderCell>
                            <TableHeaderCell className="justify-end">{t('products.colSalesPerDay')}</TableHeaderCell>
                            <TableHeaderCell className="justify-end">{t('products.colRevenue')}</TableHeaderCell>
                            <TableHeaderCell className="justify-end">{t('products.colNet')}</TableHeaderCell>
                        </TableHeader>
                        <div className="flex flex-col overflow-y-auto max-h-96">
                            {sortedProducts.map((product, index) => {
                                const rowKey = getSearchProductRowKey(product, index)

                                return (
                                    <ProductRow
                                        key={rowKey}
                                        rowKey={rowKey}
                                        product={product}
                                        isExpanded={expandedRowKey === rowKey}
                                        onToggle={handleToggle}
                                        onBookmark={handleBookmark}
                                    />
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </DataCard>
    )
}
