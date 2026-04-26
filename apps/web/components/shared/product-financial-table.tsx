'use client'

import { memo, useCallback, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Bookmark, ChevronDown, ChevronRight, ImageIcon, Star } from 'lucide-react'
import { Button, Caption, TableHeader, TableHeaderCell, TextLink } from '@puckora/ui'
import { cn, formatCount, formatMoney, formatRating, formatWeight } from '@puckora/utils'
import type { ProductFinancial } from '@puckora/types'
import { searchProductRoute } from '@/constants/routes'
import { MARK_STATES } from '@/constants/app-state'
import { useAppStore } from '@/lib/store'

// Shared grid template — header + rows must match
export const PRODUCT_TABLE_ROW_GRID = 'grid-cols-[14px_1fr_68px_100px_52px_88px_64px]'

function getProductRowKey(product: Pick<ProductFinancial, 'asin' | 'title'>, index: number): string {
    return product.asin ?? `${product.title ?? 'product'}-${index}`
}

interface ProductRowProps {
    rowKey: string
    product: ProductFinancial
    isExpanded: boolean
    onToggle: (rowKey: string) => void
    onBookmark: (asin: string, title: string) => void
}

export const ProductFinancialRow = memo(function ProductFinancialRow({
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
    // Prefer the raw scrape value (Amazon's "X bought in past month") over BSR estimate
    const soldPerMonth = product.bought_past_month ?? product.monthly_units
    const soldIsEstimate = product.bought_past_month == null && product.monthly_units != null
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
                    PRODUCT_TABLE_ROW_GRID,
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

                {/* Sold/month — raw bought_past_month from scrape, with BSR-estimate fallback */}
                <Caption className={cn(
                    'tabular-nums text-right',
                    soldIsEstimate ? 'text-muted-foreground' : '',
                )}>
                    {soldPerMonth != null ? `${formatCount(soldPerMonth)}/mo` : '—'}
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
                    {product.bought_past_month != null && (
                        <span className="flex items-center gap-1.5">
                            <Caption className="text-muted-foreground">Bought/mo</Caption>
                            <Caption className="tabular-nums">{formatCount(product.bought_past_month)}</Caption>
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
                            <TextLink href={searchProductRoute(asin)} underline="hover">
                                {t('products.viewProduct')}
                            </TextLink>
                        )}
                        {asin ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn('h-6 w-6 p-0 shrink-0', isBookmarked && 'text-primary')}
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

interface ProductFinancialTableProps {
    products: ProductFinancial[]
}

/**
 * Expandable two-layer product table.
 * Shared between /search/[query] overview and /search/discover.
 */
export function ProductFinancialTable({ products }: ProductFinancialTableProps) {
    const t = useTranslations('search')
    const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null)

    const handleToggle = useCallback((rowKey: string) => {
        setExpandedRowKey((prev) => (prev === rowKey ? null : rowKey))
    }, [])

    const handleBookmark = useCallback((asin: string, title: string) => {
        const { markedProducts, markProduct, unmarkProduct } = useAppStore.getState()
        if (markedProducts[asin]) {
            unmarkProduct(asin)
        } else {
            markProduct({ asin, name: title, markState: MARK_STATES.INTERESTED })
        }
    }, [])

    return (
        <div className="flex flex-col overflow-x-auto">
            <TableHeader gridClassName={PRODUCT_TABLE_ROW_GRID}>
                <div />
                <TableHeaderCell>{t('products.colProduct')}</TableHeaderCell>
                <TableHeaderCell className="justify-end">{t('products.colPrice')}</TableHeaderCell>
                <TableHeaderCell>{t('rating.card')}</TableHeaderCell>
                <TableHeaderCell className="justify-end">{t('products.colUnits')}</TableHeaderCell>
                <TableHeaderCell className="justify-end">{t('products.colRevenue')}</TableHeaderCell>
                <TableHeaderCell className="justify-end">{t('products.colNet')}</TableHeaderCell>
            </TableHeader>
            <div className="flex flex-col overflow-y-auto max-h-[calc(100vh-220px)]">
                {products.map((product, index) => {
                    const rowKey = getProductRowKey(product, index)
                    return (
                        <ProductFinancialRow
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
    )
}
