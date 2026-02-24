import React from 'react'
import { cn } from '@repo/utils'

/**
 * SilkBadge — Status stamps.
 *
 * Rules:
 * - Zero border-radius (0px)
 * - CSS variables only
 * - No hover animations (badges are read-only indicators)
 */

export type SilkBadgeVariant =
    | 'default'
    | 'gold'
    | 'scarlet'
    | 'purple'
    | 'success'
    | 'warning'
    | 'error'
    | 'muted'

export type SilkBadgeSize = 'sm' | 'md'

export interface SilkBadgeProps {
    variant?: SilkBadgeVariant
    size?: SilkBadgeSize
    dot?: boolean
    children: React.ReactNode
    className?: string
}

const variantStyles: Record<SilkBadgeVariant, React.CSSProperties> = {
    default: {
        background: 'var(--sf-surface)',
        color: 'var(--sf-text-sub)',
        border: '1px solid var(--sf-border)',
    },
    gold: {
        background: 'var(--sf-gold-bg)',
        color: 'var(--sf-gold)',
        border: '1px solid var(--sf-gold)',
    },
    scarlet: {
        background: 'var(--sf-scarlet-bg)',
        color: 'var(--sf-scarlet)',
        border: '1px solid var(--sf-scarlet)',
    },
    purple: {
        background: 'var(--sf-purple-bg)',
        color: 'var(--sf-purple)',
        border: '1px solid var(--sf-purple)',
    },
    success: {
        background: 'var(--sf-success-bg)',
        color: 'var(--sf-success)',
        border: '1px solid var(--sf-success)',
    },
    warning: {
        background: 'var(--sf-warning-bg)',
        color: 'var(--sf-warning)',
        border: '1px solid var(--sf-warning)',
    },
    error: {
        background: 'var(--sf-error-bg)',
        color: 'var(--sf-error)',
        border: '1px solid var(--sf-error)',
    },
    muted: {
        background: 'var(--sf-surface-alt)',
        color: 'var(--sf-text-muted)',
        border: '1px solid var(--sf-border)',
    },
}

const dotColor: Record<SilkBadgeVariant, string> = {
    default: 'var(--sf-text-sub)',
    gold: 'var(--sf-gold)',
    scarlet: 'var(--sf-scarlet)',
    purple: 'var(--sf-purple)',
    success: 'var(--sf-success)',
    warning: 'var(--sf-warning)',
    error: 'var(--sf-error)',
    muted: 'var(--sf-text-muted)',
}

const sizeStyles: Record<SilkBadgeSize, React.CSSProperties> = {
    sm: { fontSize: '10px', padding: '2px 6px', fontWeight: 600, letterSpacing: '0.05em' },
    md: { fontSize: '11px', padding: '3px 8px', fontWeight: 600, letterSpacing: '0.04em' },
}

export function SilkBadge({
    variant = 'default',
    size = 'md',
    dot = false,
    children,
    className,
}: SilkBadgeProps) {
    return (
        <span
            className={cn('inline-flex items-center gap-1.5 uppercase', className)}
            style={{
                ...variantStyles[variant],
                ...sizeStyles[size],
                borderRadius: 0,
                lineHeight: '1',
            }}
        >
            {dot && (
                <span
                    style={{
                        width: 4,
                        height: 4,
                        borderRadius: 0,
                        background: dotColor[variant],
                        display: 'inline-block',
                        flexShrink: 0,
                    }}
                />
            )}
            {children}
        </span>
    )
}

/** SilkScoreBadge — shows a numeric score with tier coloring */
export function SilkScoreBadge({
    score,
    max = 100,
    className,
}: {
    score: number
    max?: number
    className?: string
}) {
    const pct = (score / max) * 100
    const variant: SilkBadgeVariant =
        pct >= 70 ? 'success'
            : pct >= 50 ? 'gold'
                : pct >= 30 ? 'warning'
                    : 'error'

    return (
        <SilkBadge variant={variant} size="md" className={className}>
            {score}/{max}
        </SilkBadge>
    )
}
