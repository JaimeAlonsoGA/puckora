'use client'

import { memo, useCallback, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Bookmark, ChevronDown, ChevronRight, ImageIcon, LayoutGrid, LayoutList, Star } from 'lucide-react'
import { Button, Caption, DataCard, TableHeader, TableHeaderCell } from '@puckora/ui'
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

const SKELETON_COUNT = 9
// Shared grid template — header + rows must match
const ROW_GRID = 'grid-cols-[14px_1fr_68px_100px_52px_88px_64px]'

interface TopProductsCardProps {
    products: ProductFinancial[]
    query: string
    marketplace: string
    availability: SearchDataAvailability
}

interface ProductRowProps {
    product: ProductFinancial
    query: string
    marketplace: string
    isExpanded: boolean
    onToggle: (asin: string) => void
    onBookmark: (asin: string, title: string) => void
}

const ProductRow = memo(function ProductRow({
    product,
    query,
    marketplace: _marketplace,
    isExpanded,
    onToggle,
    onBookmark,
}: ProductRowProps) {
    const asin = product.asin ?? ''
    const rev = Number(product.monthly_revenue ?? 0)
    const net = Number(product.net_per_unit ?? 0)
    const vel = Number(product.daily_velocity ?? 0)
    const isBookmarked = useAppStore((state) => Boolean(state.markedProducts[asin]))

    return (
        <>
            {/* Layer 1 — always visible */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => onToggle(asin)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(asin) }}
                className={cn(
                    'grid items-center gap-2 px-3 py-1.5 cursor-pointer select-none transition-colors',
                    'border-b border-border/50 hover:bg-accent/50',
                    ROW_GRID,
                    isExpanded && 'bg-accent/30',
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
                    net > 0 ? 'text-emerald-500' : net < 0 ? 'text-destructive' : 'text-muted-foreground',
                )}>
                    {net !== 0 ? formatMoney(net) : '—'}
                </Caption>
            </div>

            {/* Layer 2 — expanded detail */}
            {isExpanded && (
                <div className="bg-accent/20 px-8 py-2 grid grid-flow-col-dense items-center gap-y-1 border-b border-border">
                    {product.brand && (
                        <span className="flex items-center gap-1.5">
                            <Caption className="text-muted-foreground">Brand</Caption>
                            <Caption className="text-foreground">{product.brand}</Caption>
                        </span>
                    )}
                    {product.pkg_weight_kg != null && (
                        <span className="flex items-center gap-1.5">
                            <Caption className="text-muted-foreground">Weight</Caption>
                            <Caption>{formatWeight(product.pkg_weight_kg)}</Caption>
                        </span>
                    )}
                    {product.fba_fee != null && (
                        <span className="flex items-center gap-1.5">
                            <Caption className="text-muted-foreground">FBA</Caption>
                            <Caption>{formatMoney(product.fba_fee)}</Caption>
                        </span>
                    )}
                    {product.referral_fee != null && (
                        <span className="flex items-center gap-1.5">
                            <Caption className="text-muted-foreground">Referral</Caption>
                            <Caption>{formatMoney(product.referral_fee)}</Caption>
                        </span>
                    )}
                    <span className="flex items-center gap-1.5">
                        {asin && (
                            <Link
                                href={searchProductRoute(query, asin)}
                                className="text-xs text-primary underline-offset-2 hover:underline"
                            >
                                View product
                            </Link>
                        )}
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
                    </span>
                </div>
            )}
        </>
    )
})

export function ProductsCard({ products, query, marketplace, availability }: TopProductsCardProps) {
    const t = useTranslations('search')
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.PRODUCT_IMAGES)
    const [view, setView] = useState<'grid' | 'table'>('grid')
    const [expandedAsin, setExpandedAsin] = useState<string | null>(null)

    // Stable handler — functional update, no deps
    const handleToggle = useCallback((asin: string) => {
        setExpandedAsin((prev) => (prev === asin ? null : asin))
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

    if (view === 'grid' && withImages.length === 0) return null

    return (
        <DataCard
            title={t('images.card')}
            className="flex-1 min-h-0"
            headerAction={
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn('h-6 w-6 p-0', view === 'grid' && 'bg-accent text-accent-foreground')}
                        onClick={() => setView('grid')}
                    >
                        <LayoutGrid aria-hidden="true" className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn('h-6 w-6 p-0', view === 'table' && 'bg-accent text-accent-foreground')}
                        onClick={() => setView('table')}
                    >
                        <LayoutList aria-hidden="true" className="size-3.5" />
                    </Button>
                </div>
            }
            {...tutorial}
        >
            <div className="flex flex-col gap-2">
                {view === 'grid' ? (
                    /* Grid view — image rail */
                    <div className="grid grid-rows-3 grid-flow-col auto-cols-[155px] gap-1.5 overflow-x-auto pb-1">
                        {withImages.map((product) => (
                            <Link
                                key={product.asin}
                                href={searchProductRoute(query, product.asin)}
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
                            <TableHeaderCell>Product</TableHeaderCell>
                            <TableHeaderCell className="justify-end">Price</TableHeaderCell>
                            <TableHeaderCell>Rating</TableHeaderCell>
                            <TableHeaderCell className="justify-end">Sales/d</TableHeaderCell>
                            <TableHeaderCell className="justify-end">Rev/mo</TableHeaderCell>
                            <TableHeaderCell className="justify-end">Net/unit</TableHeaderCell>
                        </TableHeader>
                        <div className="flex flex-col overflow-y-auto max-h-100">
                            {sortedProducts.map((product) => (
                                <ProductRow
                                    key={product.asin ?? product.title ?? String(Math.random())}
                                    product={product}
                                    query={query}
                                    marketplace={marketplace}
                                    isExpanded={expandedAsin === product.asin}
                                    onToggle={handleToggle}
                                    onBookmark={handleBookmark}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DataCard>
    )
}
