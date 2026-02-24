/**
 * SilkAreaChart — Recharts AreaChart with Silkflow v2 styling.
 *
 * Recharts constraint: CSS variables are not supported as stroke/fill values.
 * All chart colors use literal hex constants that mirror --sf-* tokens exactly.
 * These are the ONLY permitted hardcoded colors in this file.
 */
import React from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

// Recharts constraint: CSS variables not supported as stroke/fill values.
// Values mirror --sf-* tokens exactly.
const CHART_COLORS = {
    gold: { stroke: '#A67C00', fill: ['#A67C00', '#855F00'] },  // --sf-gold / --sf-gold-dark
    scarlet: { stroke: '#C0152A', fill: ['#C0152A', '#960F20'] },  // --sf-scarlet / --sf-scarlet-dark
    purple: { stroke: '#6B1D8A', fill: ['#6B1D8A', '#521669'] },  // --sf-purple / --sf-purple-dark
    success: { stroke: '#1A6B3C', fill: ['#1A6B3C', '#145430'] },  // --sf-success
    info: { stroke: '#1B3FA8', fill: ['#1B3FA8', '#1530800'] }, // --sf-info
}

export type SilkAreaChartColor = keyof typeof CHART_COLORS

export interface SilkAreaChartSeries {
    key: string
    color?: SilkAreaChartColor
    name?: string
    stroke?: string
    fillFrom?: string
    fillTo?: string
}

export interface SilkAreaChartProps {
    data: Record<string, unknown>[]
    series: SilkAreaChartSeries[]
    xKey: string
    height?: number
    formatValue?: (v: number) => string
    formatX?: (v: string) => string
    showGrid?: boolean
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

export function SilkAreaChart({
    data,
    series,
    xKey,
    height = 220,
    formatValue,
    formatX,
    showGrid = false,
    className,
}: SilkAreaChartProps) {
    return (
        <div className={className} style={{ height, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                        {series.map((s, i) => {
                            const color = s.color ? CHART_COLORS[s.color] : null
                            const fromColor = s.fillFrom ?? color?.fill[0] ?? '#A67C00'
                            const toColor = s.fillTo ?? color?.fill[1] ?? '#855F00'
                            return (
                                <linearGradient key={`grad-${i}`} id={`silk-area-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={fromColor} stopOpacity={0.25} />
                                    <stop offset="100%" stopColor={toColor} stopOpacity={0.02} />
                                </linearGradient>
                            )
                        })}
                    </defs>
                    {showGrid && (
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(55,48,163,0.08)" vertical={false} />
                    )}
                    <XAxis
                        dataKey={xKey}
                        tick={{ fill: '#999999', fontSize: 10, fontFamily: 'Inter' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatX}
                    />
                    <YAxis
                        tick={{ fill: '#999999', fontSize: 10, fontFamily: 'Inter' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatValue}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => (
                            <SilkTooltip active={active} payload={payload} label={label} formatValue={formatValue} />
                        )}
                        cursor={{ stroke: 'rgba(55,48,163,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    {series.map((s, i) => {
                        const color = s.color ? CHART_COLORS[s.color] : null
                        const strokeColor = s.stroke ?? color?.stroke ?? '#A67C00'
                        return (
                            <Area
                                key={s.key}
                                type="monotone"
                                dataKey={s.key}
                                name={s.name}
                                stroke={strokeColor}
                                strokeWidth={2}
                                fill={`url(#silk-area-grad-${i})`}
                                dot={false}
                                activeDot={{ r: 4, fill: strokeColor, stroke: '#FFFFFF', strokeWidth: 2 }}
                                isAnimationActive
                                animationDuration={800}
                                animationEasing="ease-out"
                            />
                        )
                    })}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
