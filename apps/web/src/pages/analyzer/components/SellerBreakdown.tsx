// Seller Breakdown panel
import React from 'react'
import { MetricCard } from '@repo/ui'

export interface SellerBreakdownProps {
    seller_count?: number | null
    fba_seller_count?: number | null
}

export function SellerBreakdownPanel({ seller_count, fba_seller_count }: SellerBreakdownProps) {
    const fbm = Math.max(0, (seller_count ?? 0) - (fba_seller_count ?? 0))
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard label="Total Sellers" value={seller_count ?? '—'} />
            <MetricCard label="FBA Sellers" value={fba_seller_count ?? '—'} />
            <MetricCard label="FBM Sellers" value={fbm} />
        </div>
    )
}
