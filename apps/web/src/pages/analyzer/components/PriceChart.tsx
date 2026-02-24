import React, { useState } from 'react'
import { SilkAreaChart, SilkCard } from '@repo/ui'
import { Row } from '@/components/building-blocks/layout'
import { Caption } from '@/components/building-blocks/typography'
import { useProductHistory, type HistoryWindow } from '@/hooks/useProductHistory'
import { useT } from '@/hooks/useT'
import { formatCurrency } from '@repo/utils'

export interface PriceChartProps {
    asin: string
}

const WINDOWS: { key: HistoryWindow; labelKey: string }[] = [
    { key: '30d', labelKey: 'trend.days30' },
    { key: '90d', labelKey: 'trend.days90' },
    { key: '180d', labelKey: 'trend.days180' },
    { key: 'all', labelKey: 'trend.allTime' },
]

export function PriceChart({ asin }: PriceChartProps) {
    const { t } = useT('analyzer')
    const [window, setWindow] = useState<HistoryWindow>('90d')
    const { data, isLoading } = useProductHistory(asin, window)

    const chartData = (data?.pricePoints ?? []).map(p => ({
        date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: p.price,
    }))

    return (
        <SilkCard className="p-4">
            <Row className="mb-3 justify-between items-center flex-wrap gap-1">
                <Caption className="text-text-muted uppercase tracking-wider text-[10px]">Price History</Caption>
                <Row gap="xs">
                    {WINDOWS.map(w => (
                        <button
                            key={w.key}
                            onClick={() => setWindow(w.key)}
                            className={`px-2 py-0.5 text-[10px] font-medium border transition-colors ${window === w.key
                                    ? 'bg-accent-primary text-white border-transparent'
                                    : 'border-border text-text-muted hover:text-text-primary'
                                }`}
                        >
                            {t(w.labelKey as never)}
                        </button>
                    ))}
                </Row>
            </Row>
            {isLoading ? (
                <div className="h-[180px] bg-surface-secondary border border-border animate-pulse" />
            ) : chartData.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center">
                    <Caption className="text-text-muted">No price history yet</Caption>
                </div>
            ) : (
                <SilkAreaChart
                    data={chartData}
                    series={[{ key: 'price', color: 'gold', name: 'Price' }]}
                    xKey="date"
                    height={180}
                    formatValue={v => formatCurrency(v)}
                    showGrid
                />
            )}
        </SilkCard>
    )
}
