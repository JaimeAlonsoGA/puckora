'use client'

import { useTranslations } from 'next-intl'
import { Button, Badge, ListToolbar } from '@puckora/ui'
import {
    OverviewLayout,
    OverviewPanel,
    OverviewMain,
    OverviewMainContent,
} from '@/components/layout/overview-layout'
import { AppRoute, searchKeywordRoute } from '@/constants/routes'
import { buildAmazonProductUrl } from '@/constants/amazon-marketplace'
import type { ProductFinancial } from '@puckora/types'
import type { AmazonProduct } from '@puckora/types'
import { ProductSidebar } from './product-sidebar'
import { ProductHeader } from './product-header'
import { ProductKpis } from './product-kpis'
import { ProductEconomics } from './product-economics'
import { ProductPosition } from './product-position'
import { ProductLogistics } from './product-logistics'
import { ProductBullets } from './product-bullets'

interface ProductViewProps {
    product: ProductFinancial
    rawProduct: AmazonProduct | null
    query: string | null
    marketplace: string
}

export function ProductView({ product, rawProduct, query, marketplace }: ProductViewProps) {
    const t = useTranslations('product')

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <ListToolbar>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        href={query ? searchKeywordRoute(query) : AppRoute.search}
                    >
                        {query ? t('nav.backTo', { keyword: query }) : t('nav.backToResults')}
                    </Button>
                    <Badge variant={product.fba_fee ? 'brand' : 'default'} size="sm">
                        {product.fba_fee ? t('logistics.fulfilmentFba') : t('logistics.fulfilmentFbm')}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        href={buildAmazonProductUrl(marketplace, product.asin ?? '')}
                        external
                    >
                        {t('actions.openOnAmazon')}
                    </Button>
                </div>
            </ListToolbar>
            <OverviewLayout>
                <OverviewPanel side="left">
                    <ProductSidebar product={product} rawProduct={rawProduct} />
                </OverviewPanel>
                <OverviewPanel side="right">
                    <OverviewMain>
                        <OverviewMainContent>
                            <ProductHeader product={product} />
                            <ProductKpis product={product} />
                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                <ProductEconomics product={product} rawProduct={rawProduct} />
                                <ProductPosition product={product} />
                            </div>
                            <ProductLogistics product={product} />
                            <ProductBullets rawProduct={rawProduct} />
                        </OverviewMainContent>
                    </OverviewMain>
                </OverviewPanel>
            </OverviewLayout>
        </div>
    )
}
