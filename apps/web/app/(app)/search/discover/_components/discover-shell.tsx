'use client'

import type { User } from '@puckora/types'
import type { DiscoverFilters } from '@/schemas/discover'
import type { ProductFinancial } from '@puckora/types'
import { DiscoverFiltersBar } from './discover-filters'
import { DiscoverResults } from './discover-results'

interface DiscoverShellProps {
    user: User
    filters: DiscoverFilters
    hasFilters: boolean
    initialProducts: ProductFinancial[]
}

export function DiscoverShell({ filters, hasFilters, initialProducts }: DiscoverShellProps) {
    return (
        <div className="flex flex-1 flex-col min-h-0">
            <DiscoverFiltersBar filters={filters} />
            <DiscoverResults products={initialProducts} hasFilters={hasFilters} />
        </div>
    )
}
