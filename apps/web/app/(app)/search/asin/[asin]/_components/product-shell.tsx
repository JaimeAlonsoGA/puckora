'use client'

import type { ProductFinancial } from '@puckora/types'
import type { AmazonProduct } from '@puckora/types'
import { useProductResearchGraph } from '@/hooks/use-product-research-graph'
import { ProductNotFound } from './product-not-found'
import { ProductOverview } from './product-overview'

interface ProductShellProps {
    product: ProductFinancial | null
    rawProduct: AmazonProduct | null
    query: string | null
    asin: string
    marketplace: string
}

/**
 * Orchestrator shell — owns graph tracking, no UI markup.
 * Receives server-prefetched product data, dispatches to display components.
 */
export function ProductShell({ product, rawProduct, query, asin, marketplace }: ProductShellProps) {
    useProductResearchGraph(product?.title ?? asin, asin, query ?? '')

    if (!product) return <ProductNotFound asin={asin} query={query} />

    return (
        <ProductOverview
            product={product}
            rawProduct={rawProduct}
            query={query}
            marketplace={marketplace}
        />
    )
}
