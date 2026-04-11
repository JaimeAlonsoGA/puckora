'use client'

import { useTranslations } from 'next-intl'
import { Caption } from '@puckora/ui'
import type { ProductFinancial } from '@puckora/types'
import { ProductFinancialTable } from '@/components/shared/product-financial-table'

interface DiscoverResultsProps {
    products: ProductFinancial[]
    hasFilters: boolean
}

export function DiscoverResults({ products, hasFilters }: DiscoverResultsProps) {
    const t = useTranslations('search')

    if (!hasFilters) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Caption className="text-muted-foreground">{t('discover.emptyState')}</Caption>
            </div>
        )
    }

    if (products.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Caption className="text-muted-foreground">{t('discover.noResults')}</Caption>
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col min-h-0 overflow-auto">
            <div className="flex shrink-0 items-center gap-2 border-b-hairline px-4 py-2">
                <Caption className="text-muted-foreground">
                    {t('discover.resultsCount', { count: products.length })}
                </Caption>
            </div>
            <ProductFinancialTable products={products} />
        </div>
    )
}
