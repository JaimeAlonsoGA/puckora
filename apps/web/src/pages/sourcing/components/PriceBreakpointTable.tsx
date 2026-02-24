import React from 'react'
import { Body } from '@/components/building-blocks/typography'

// Local UI type — Alibaba price tier
interface PriceBreakpoint { minQuantity: number; maxQuantity?: number; pricePerUnit: number }

export interface PriceBreakpointTableProps { breakpoints: PriceBreakpoint[]; currency?: string }

export function PriceBreakpointTable({ breakpoints, currency = 'USD' }: PriceBreakpointTableProps) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-border"><th className="py-1 px-2 text-left text-text-secondary">Min Qty</th><th className="text-left text-text-secondary py-1 px-2">Max Qty</th><th className="text-left text-text-secondary py-1 px-2">Price/{currency}</th></tr></thead>
      <tbody>{breakpoints.map((b, i) => (
        <tr key={i} className="border-b border-border"><td className="py-1 px-2 text-text-primary">{b.minQuantity}</td><td className="py-1 px-2 text-text-muted">{b.maxQuantity ?? '∞'}</td><td className="py-1 px-2 text-text-primary">${b.pricePerUnit.toFixed(2)}</td></tr>
      ))}</tbody>
    </table>
  )
}
