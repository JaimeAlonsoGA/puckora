import React from 'react'
import { cn } from '@repo/utils'

/**
 * KPICard — Key performance indicator display.
 *
 * Rules:
 * - Zero border-radius
 * - CSS variables only
 * - Monospace value typography
 * - Accent = top border strip (not left) — distinguishable from SilkCard
 */

export interface KPICardProps {
    label: string
    value: string | number
    formatted?: string
    trend?: number
    trendLabel?: string
    note?: string
    accent?: 'gold' | 'scarlet' | 'purple' | 'success' | 'warning'
    icon?: React.ReactNode
    className?: string
}

const accentColor: Record<string, string> = {
    gold: 'var(--sf-gold)',
    scarlet: 'var(--sf-scarlet)',
    purple: 'var(--sf-purple)',
    success: 'var(--sf-success)',
    warning: 'var(--sf-warning)',
}

const accentBg: Record<string, string> = {
    gold: 'var(--sf-gold-bg)',
    scarlet: 'var(--sf-scarlet-bg)',
    purple: 'var(--sf-purple-bg)',
    success: 'var(--sf-success-bg)',
    warning: 'var(--sf-warning-bg)',
}

export function KPICard({
    label,
    value,
    formatted,
    trend,
    trendLabel,
    note,
    accent,
    icon,
    className,
}: KPICardProps) {
    const isPositive = trend !== undefined && trend >= 0
    const isNegative = trend !== undefined && trend < 0

    return (
        <div
            className={cn('relative', className)}
            style={{
                background: accent ? accentBg[accent] : 'var(--sf-bg)',
                border: '1px solid var(--sf-border)',
                borderTop: accent ? `2px solid ${accentColor[accent]}` : '1px solid var(--sf-border)',
                borderRadius: 0,
                padding: '20px 24px',
            }}
        >
            {/* Label row */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <span
                    style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--sf-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                    }}
                >
                    {label}
                </span>
                {icon && (
                    <span style={{ color: accent ? accentColor[accent] : 'var(--sf-text-muted)' }}>
                        {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 16 })}
                    </span>
                )}
            </div>

            {/* Value */}
            <div
                style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: 'var(--sf-text)',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    marginBottom: '8px',
                }}
            >
                {formatted ?? value}
            </div>

            {/* Trend + note */}
            <div className="flex items-center gap-2">
                {trend !== undefined && (
                    <span
                        style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: isPositive
                                ? 'var(--sf-success)'
                                : isNegative
                                    ? 'var(--sf-error)'
                                    : 'var(--sf-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                        }}
                    >
                        {isPositive ? '▲' : isNegative ? '▼' : '—'}{' '}
                        {Math.abs(trend).toFixed(1)}%
                    </span>
                )}
                {(note || trendLabel) && (
                    <span style={{ fontSize: '11px', color: 'var(--sf-text-muted)' }}>
                        {trendLabel ?? note}
                    </span>
                )}
            </div>
        </div>
    )
}
