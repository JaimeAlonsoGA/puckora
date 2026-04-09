'use client'

import type { ProductFinancial } from '@puckora/types'
import type { SearchOverviewStats } from '@puckora/utils'
import type { SearchDataAvailability } from '@/types/search'
import { ProductsCard } from './cards/products-card'
import { PriceDistCard } from './cards/price-dist-card'
import { MarketShareCard } from './cards/market-share-card'

interface AnalysisRowProps {
    products: ProductFinancial[]
    stats: SearchOverviewStats
    query: string
    marketplace: string
    availability: SearchDataAvailability
}

export function AnalysisRow({ products, stats, query, marketplace, availability }: AnalysisRowProps) {
    return (
        <div className="flex flex-row gap-2">
            {/* Left ~60% — product image rail */}
            <div className="flex-3 min-w-0">
                <ProductsCard
                    products={products}
                    query={query}
                    marketplace={marketplace}
                    availability={availability}
                />
            </div>
            {/* Right ~40% — price distribution + market share */}
            <div className="flex-2 min-w-0 flex flex-col gap-2">
                <PriceDistCard stats={stats} availability={availability} />
                <MarketShareCard
                    products={products}
                    availability={availability}
                />
            </div>
        </div>
    )
}

