'use client'

import { useQuery } from '@tanstack/react-query'
import { useProductResearchGraph } from '@/hooks/use-product-research-graph'
import { amazonProductQueryOptions } from '@/queries'
import { SEARCH_POLL_INTERVAL_MS } from '@/constants/search'
import type { ProductFinancial } from '@puckora/types'
import type { AmazonProduct } from '@puckora/types'
import { ProductNotFound } from './product-not-found'
import { ProductView } from './product-view'

interface ProductShellProps {
    product: ProductFinancial | null
    rawProduct: AmazonProduct | null
    asin: string
    query: string | null
    marketplace: string
}

export function ProductShell({
    product: initialProduct,
    rawProduct,
    asin,
    query,
    marketplace,
}: ProductShellProps) {
    useProductResearchGraph(initialProduct?.title ?? asin, asin, query ?? '')

    const { data: product } = useQuery({
        ...amazonProductQueryOptions(asin, marketplace),
        initialData: initialProduct ?? undefined,
        enabled: !!initialProduct,
        refetchInterval: (q) => {
            const d = q.state.data
            if (d?.monthly_revenue != null && d?.bought_past_month != null) return false
            return SEARCH_POLL_INTERVAL_MS.ENRICHMENT_RESULTS
        },
    })

    if (!initialProduct) return <ProductNotFound asin={asin} query={query} />

    return (
        <ProductView
            product={product ?? initialProduct}
            rawProduct={rawProduct}
            query={query}
            marketplace={marketplace}
        />
    )
}
