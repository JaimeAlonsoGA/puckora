/**
 * SilkDonutChart — Recharts PieChart (donut) with Silkflow v2 styling.
 *
 * Recharts constraint: CSS variables not supported as stroke/fill values.
 * All chart colors use literal hex constants that mirror --sf-* tokens exactly.
 */
import React from 'react'
import {
    PieChart,
    Pie,
    Cell,
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

export interface SilkDonutDataItem {
    name: string
    value: number
    color?: string
}

export interface SilkDonutChartProps {
    data: SilkDonutDataItem[]
    height?: number
    innerRadius?: number | string
    outerRadius?: number | string
    formatValue?: (v: number) => string
    showLegend?: boolean
    centerLabel?: string
    centerValue?: string
    className?: string
}

interface SilkTooltipProps {
    active?: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: readonly any[]
    formatValue?: (v: number) => string
}

function SilkTooltip({ active, payload, formatValue }: SilkTooltipProps) {
    if (!active || !payload?.length) return null
    const entry = payload[0]
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 0, background: entry.payload.fill, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#555555' }}>{entry.name}</span>
            </div>
            <div style={{ fontSize: 14, color: '#111111', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                {formatValue ? formatValue(entry.value as number) : String(entry.value ?? '')}
            </div>
        </div>
    )
}

export function SilkDonutChart({
    data,
    height = 220,
    innerRadius = '60%',
    outerRadius = '82%',
    formatValue,
    showLegend = false,
    centerLabel,
    centerValue,
    className,
}: SilkDonutChartProps) {
    return (
        <div className={className} style={{ height, width: '100%', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={innerRadius}
                        outerRadius={outerRadius}
                        strokeWidth={0}
                        isAnimationActive
                        animationDuration={800}
                        animationEasing="ease-out"
                    >
                        {data.map((entry, i) => (
                            <Cell
                                key={`cell-${i}`}
                                fill={entry.color ?? SILK_PALETTE[i % SILK_PALETTE.length]}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => (
                            <SilkTooltip active={active} payload={payload} formatValue={formatValue} />
                        )}
                    />
                    {showLegend && (
                        <Legend
                            wrapperStyle={{ fontSize: 11, color: '#555555' }}
                            iconSize={8}
                            iconType="square"
                        />
                    )}
                </PieChart>
            </ResponsiveContainer>
            {(centerLabel || centerValue) && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        pointerEvents: 'none',
                    }}
                >
                    {centerValue && (
                        <div style={{
                            fontSize: '22px',
                            fontWeight: 700,
                            color: '#111111',
                            fontFamily: 'JetBrains Mono, monospace',
                            lineHeight: 1,
                            letterSpacing: '-0.02em',
                        }}>
                            {centerValue}
                        </div>
                    )}
                    {centerLabel && (
                        <div style={{ fontSize: '10px', color: '#999999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                            {centerLabel}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
