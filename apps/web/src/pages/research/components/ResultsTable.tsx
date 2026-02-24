import React from 'react'
import type { AmazonProduct } from '@repo/types'
import { DataTable } from '@repo/ui'
import type { Column } from '@repo/ui'
import { formatCurrency } from '@repo/utils'

export interface ResultsTableProps {
    products: AmazonProduct[]
}

export function ResultsTable({ products }: ResultsTableProps) {
    const columns: Column<AmazonProduct>[] = [
        { key: 'asin', header: 'ASIN', sortable: false },
        { key: 'title', header: 'Title', sortable: false },
        { key: 'price', header: 'Price', sortable: true, render: (r) => formatCurrency(r.price ?? 0) },
        { key: 'bsr', header: 'BSR', sortable: true, render: (r) => (r.bsr ?? 0).toLocaleString() },
        { key: 'review_count', header: 'Reviews', sortable: true, render: (r) => (r.review_count ?? 0).toLocaleString() },
        { key: 'rating', header: 'Rating', sortable: true, render: (r) => `★ ${(r.rating ?? 0).toFixed(1)}` },
    ]

    return (
        <DataTable
            columns={columns}
            data={products}
            keyExtractor={r => r.asin}
        />
    )
}
