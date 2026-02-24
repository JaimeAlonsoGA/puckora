/**
 * SilkRadarChart — Recharts RadarChart with Silkflow v2 styling.
 *
 * Recharts constraint: CSS variables not supported as stroke/fill values.
 * All chart colors use literal hex constants that mirror --sf-* tokens exactly.
 */
import React from 'react'
import {
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
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

export interface SilkRadarChartSeries {
    key: string
    name?: string
    color?: string
}

export interface SilkRadarChartProps {
    data: Record<string, unknown>[]
    series: SilkRadarChartSeries[]
    angleKey: string
    height?: number
    formatValue?: (v: number) => string
    showLegend?: boolean
    outerRadius?: number | string
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
                    <div style={{ width: 8, height: 8, borderRadius: 0, background: entry.stroke, flexShrink: 0 }} />
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

export function SilkRadarChart({
    data,
    series,
    angleKey,
    height = 260,
    formatValue,
    showLegend = false,
    outerRadius = '75%',
    className,
}: SilkRadarChartProps) {
    return (
        <div className={className} style={{ height, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data} outerRadius={outerRadius}>
                    <PolarGrid stroke="rgba(55,48,163,0.1)" />
                    <PolarAngleAxis
                        dataKey={angleKey}
                        tick={{ fill: '#999999', fontSize: 10, fontFamily: 'Inter' }}
                        tickLine={false}
                    />
                    <PolarRadiusAxis
                        tick={{ fill: '#999999', fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatValue}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => (
                            <SilkTooltip active={active} payload={payload} label={label} formatValue={formatValue} />
                        )}
                    />
                    {showLegend && (
                        <Legend wrapperStyle={{ fontSize: 11, color: '#555555' }} />
                    )}
                    {series.map((s, i) => {
                        const color = s.color ?? SILK_PALETTE[i % SILK_PALETTE.length]
                        return (
                            <Radar
                                key={s.key}
                                name={s.name}
                                dataKey={s.key}
                                stroke={color}
                                fill={color}
                                fillOpacity={0.12}
                                strokeWidth={1.5}
                                isAnimationActive
                                animationDuration={800}
                                animationEasing="ease-out"
                            />
                        )
                    })}
                </RadarChart>
            </ResponsiveContainer>
        </div>
    )
}
