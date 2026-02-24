import React, { useState } from 'react'
import { SilkAreaChart, SilkCard } from '@repo/ui'
import { Stack, Row } from '@/components/building-blocks/layout'
import { Caption, Heading } from '@/components/building-blocks/typography'
import { useProductHistory, type HistoryWindow } from '@/hooks/useProductHistory'
import { formatCurrency, formatNumber } from '@repo/utils'

export interface SnapshotChartProps {
  asin: string
  title?: string
}

const WINDOWS: { key: HistoryWindow; label: string }[] = [
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '180d', label: '6m' },
  { key: 'all', label: 'All' },
]

export function SnapshotChart({ asin, title }: SnapshotChartProps) {
  const [window, setWindow] = useState<HistoryWindow>('90d')
  const [metric, setMetric] = useState<'price' | 'bsr'>('price')
  const { data, isLoading } = useProductHistory(asin, window)

  const chartData = metric === 'price'
    ? (data?.pricePoints ?? []).map(p => ({
      date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: p.price,
    }))
    : (data?.bsrPoints ?? []).map(p => ({
      date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: p.bsr,
    }))

  return (
    <SilkCard className="p-4">
      <Stack gap="sm">
        <Row className="justify-between items-center">
          {title && <Caption className="text-text-muted text-[10px] uppercase tracking-wider truncate">{title}</Caption>}
          <Row gap="xs" className="ml-auto">
            {(['price', 'bsr'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-2 py-0.5 text-[10px] font-medium border transition-colors ${metric === m
                    ? 'bg-accent-primary text-white border-transparent'
                    : 'border-border text-text-muted hover:text-text-primary'
                  }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
            {WINDOWS.map(w => (
              <button
                key={w.key}
                onClick={() => setWindow(w.key)}
                className={`px-2 py-0.5 text-[10px] font-medium border transition-colors ${window === w.key
                    ? 'bg-surface-tertiary text-text-primary border-border'
                    : 'border-border text-text-muted hover:text-text-primary'
                  }`}
              >
                {w.label}
              </button>
            ))}
          </Row>
        </Row>

        {isLoading ? (
          <div className="h-[140px] bg-surface-secondary border border-border animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-[140px] flex items-center justify-center">
            <Caption className="text-text-muted">No history yet</Caption>
          </div>
        ) : (
          <SilkAreaChart
            data={chartData}
            series={[{ key: 'value', color: metric === 'price' ? 'gold' : 'scarlet', name: metric === 'price' ? 'Price' : 'BSR' }]}
            xKey="date"
            height={140}
            formatValue={metric === 'price' ? v => formatCurrency(v) : v => `#${formatNumber(v)}`}
            showGrid
          />
        )}
      </Stack>
    </SilkCard>
  )
}
