/**
 * SilkBarChart — Recharts BarChart with Silkflow v2 styling.
 *
 * Recharts constraint: CSS variables not supported as stroke/fill values.
 * All chart colors use literal hex constants that mirror --sf-* tokens exactly.
 */
import React from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'

// Recharts constraint: CSS variables not supported as stroke/fill values.
// Values mirror --sf-* tokens exactly.
const SILK_PALETTE = [
    '#A67C00', // --sf-gold
    '#C0152A', // --sf-scarlet
    '#6B1D8A', // --sf-purple
    '#1A6B3C', // --sf-success
    '#1B3FA8', // --sf-info
    '#92500A', // --sf-warning
]

export interface SilkBarChartSeries {
    key: string
    name?: string
    color?: string
}

export interface SilkBarChartProps {
    data: Record<string, unknown>[]
    series: SilkBarChartSeries[]
    xKey: string
    height?: number
    formatValue?: (v: number) => string
    formatX?: (v: string) => string
    showGrid?: boolean
    stacked?: boolean
    horizontal?: boolean
    showLegend?: boolean
    className?: string
}

interface SilkTooltipProps {
    active?: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: readonly any[]
    label?: string | number
    formatValue?: (v: number) => string
}

function SilkTooltip({ active, payload, label, formatValue }: SilkTooltipProps) {
    if (!active || !payload?.length) return null
    return (
        <div
            style={{
                background: '#FFFFFF',
                border: '1px solid rgba(55,48,163,0.15)',
                borderRadius: 0,
                padding: '8px 12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                minWidth: 120,
            }}
        >
            <div style={{ fontSize: 10, color: '#999999', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </div>
            {payload.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 0, background: entry.fill, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#111111', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatValue ? formatValue(entry.value as number) : String(entry.value ?? '')}
                    </span>
                    {entry.name != null && (
                        <span style={{ fontSize: 11, color: '#555555', marginLeft: 2 }}>{String(entry.name)}</span>
                    )}
                </div>
            ))}
        </div>
    )
}

export function SilkBarChart({
    data,
    series,
    xKey,
    height = 220,
    formatValue,
    formatX,
    showGrid = true,
    stacked = false,
    horizontal = false,
    showLegend = false,
    className,
}: SilkBarChartProps) {
    const CategoryAxis = horizontal ? YAxis : XAxis
    const ValueAxis = horizontal ? XAxis : YAxis

    return (
        <div className={className} style={{ height, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout={horizontal ? 'vertical' : 'horizontal'}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                    {showGrid && (
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(55,48,163,0.08)"
                            vertical={!horizontal}
                            horizontal={horizontal}
                        />
                    )}
                    <CategoryAxis
                        dataKey={xKey}
                        tick={{ fill: '#999999', fontSize: 10, fontFamily: 'Inter' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={horizontal ? undefined : formatX}
                    />
                    <ValueAxis
                        tick={{ fill: '#999999', fontSize: 10, fontFamily: 'Inter' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatValue}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => (
                            <SilkTooltip active={active} payload={payload} label={label} formatValue={formatValue} />
                        )}
                        cursor={{ fill: 'rgba(55,48,163,0.04)' }}
                    />
                    {showLegend && (
                        <Legend
                            wrapperStyle={{ fontSize: 11, color: '#555555', paddingTop: 8 }}
                        />
                    )}
                    {series.map((s, i) => (
                        <Bar
                            key={s.key}
                            dataKey={s.key}
                            name={s.name}
                            fill={s.color ?? SILK_PALETTE[i % SILK_PALETTE.length]}
                            stackId={stacked ? 'stack' : undefined}
                            radius={0}
                            isAnimationActive
                            animationDuration={700}
                            animationEasing="ease-out"
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
