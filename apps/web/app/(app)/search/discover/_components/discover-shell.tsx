'use client'

import type { DiscoverFilters } from '@/schemas/discover'
import type { ProductFinancial } from '@puckora/types'
import { useDiscoverProducts } from '@/queries'
import { DiscoverFiltersBar } from './discover-filters'
import { DiscoverResults } from './discover-results'

interface DiscoverShellProps {
    filters: DiscoverFilters
    hasFilters: boolean
    initialProducts: ProductFinancial[]
}

export function DiscoverShell({ filters, hasFilters, initialProducts }: DiscoverShellProps) {
    const products = useDiscoverProducts(initialProducts)

    return (
        <div className="flex flex-1 flex-col min-h-0">
            <DiscoverFiltersBar filters={filters} />
            <DiscoverResults products={products} hasFilters={hasFilters} />
        </div>
    )
}
