import { useState, useCallback } from 'react'
import type { SpApiTableRow } from '@repo/types'
import { useSpApiBulkLookup } from '@/hooks/useSpApiLookup'

export interface SpApiDemoState {
    asinInput: string
    marketplace: string
    price: string
    rows: SpApiTableRow[]
    isPending: boolean
    error: Error | null
    validCount: number
    setAsinInput: (v: string) => void
    setMarketplace: (v: string) => void
    setPrice: (v: string) => void
    handleLookup: () => void
    handleExport: () => void
}

export function useSpApiDemo(
    preloadAsins: string[] = [],
    defaultMarketplace = 'US',
    onResult?: (rows: SpApiTableRow[]) => void,
): SpApiDemoState {
    const [asinInput, setAsinInput] = useState<string>(preloadAsins.join('\n'))
    const [marketplace, setMarketplace] = useState<string>(defaultMarketplace)
    const [price, setPrice] = useState<string>('')
    const [rows, setRows] = useState<SpApiTableRow[]>([])

    const { mutate, isPending, error } = useSpApiBulkLookup()

    const parseAsins = useCallback((raw: string): string[] => {
        return raw
            .split(/[\s,;]+/)
            .map((a) => a.trim().toUpperCase())
            .filter((a) => /^[A-Z0-9]{10}$/.test(a))
    }, [])

    const handleLookup = useCallback(() => {
        const asins = parseAsins(asinInput)
        if (!asins.length) return

        mutate(
            {
                asins,
                marketplace,
                price: price ? parseFloat(price) : undefined,
            },
            {
                onSuccess: (result) => {
                    setRows(result.rows)
                    onResult?.(result.rows)
                },
            },
        )
    }, [asinInput, marketplace, price, mutate, parseAsins, onResult])

    const handleExport = useCallback(() => {
        if (!rows.length) return
        const csv = buildCsv(rows)
        triggerDownload(csv, `sp-api-${marketplace}-${Date.now()}.csv`)
    }, [rows, marketplace])

    const validCount = parseAsins(asinInput).length

    return {
        asinInput,
        marketplace,
        price,
        rows,
        isPending,
        error: error as Error | null,
        validCount,
        setAsinInput,
        setMarketplace,
        setPrice,
        handleLookup,
        handleExport,
    }
}

// ---------------------------------------------------------------------------
// CSV helpers (pure, no side-effects on state)
// ---------------------------------------------------------------------------

function buildCsv(rows: SpApiTableRow[]): string {
    const headers = [
        'ASIN', 'Title', 'Brand', 'Category', 'BSR', 'BSR Category',
        'Buy Box Price', 'Lowest New', 'Sellers',
        'Referral Fee', 'FBA Fee', 'Total Fees', 'Net Revenue', 'Margin %',
        'Marketplace', 'Source',
    ]

    const escape = (v: unknown): string => {
        if (v == null) return ''
        const s = String(v).replace(/"/g, '""')
        return /[",\n]/.test(s) ? `"${s}"` : s
    }

    const lines = rows.map((r) =>
        [
            r.asin, r.title, r.brand, r.product_type ?? r.bsr_category, r.bsr, r.bsr_category,
            r.buy_box_price, r.lowest_new_price, r.total_offer_count,
            r.referral_fee, r.fba_fulfillment_fee, r.total_fees, r.net_revenue, r.margin_pct,
            r.marketplace, r.source,
        ]
            .map(escape)
            .join(','),
    )

    return [headers.join(','), ...lines].join('\n')
}

function triggerDownload(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
