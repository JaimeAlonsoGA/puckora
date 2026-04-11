'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LayoutGrid, LayoutList } from 'lucide-react'
import { DataCard } from '@puckora/ui'
import { cn } from '@puckora/utils'
import type { ProductFinancial } from '@puckora/types'
import type { SearchDataAvailability } from '@/types/search'
import { searchProductRoute } from '@/constants/routes'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'
import { ProductFinancialTable } from '@/components/shared/product-financial-table'
import { CardViewToggle } from './card-view-toggle'

const SKELETON_COUNT = 9

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

export function ProductsCard({ products, availability }: TopProductsCardProps) {
    const t = useTranslations('search')
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.PRODUCT_IMAGES)
    const [view, setView] = useState<ProductsCardViewId>(PRODUCTS_CARD_VIEW_IDS.GRID)

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
                    /* Table view — delegates to shared component */
                    <ProductFinancialTable products={sortedProducts} />
                )}
            </div>
        </DataCard>
    )
}
