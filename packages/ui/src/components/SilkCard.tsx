import React from 'react'
import { cn } from '@repo/utils'

/**
 * SilkCard — Content container.
 *
 * Rules:
 * - Zero border-radius
 * - CSS variables only
 * - Accent variants use a 2px left border in the accent color
 * - No hover animations (cards are containers, not actions)
 */

export type SilkCardVariant = 'default' | 'flat' | 'inset' | 'gold' | 'scarlet' | 'purple'

export interface SilkCardProps {
    variant?: SilkCardVariant
    children: React.ReactNode
    className?: string
    style?: React.CSSProperties
    padding?: 'none' | 'sm' | 'md' | 'lg'
}

const variantStyles: Record<SilkCardVariant, React.CSSProperties> = {
    default: {
        background: 'var(--sf-bg)',
        border: '1px solid var(--sf-border)',
    },
    flat: {
        background: 'var(--sf-surface)',
        border: 'none',
    },
    inset: {
        background: 'var(--sf-surface-alt)',
        border: '1px solid var(--sf-border)',
    },
    gold: {
        background: 'var(--sf-gold-bg)',
        border: '1px solid var(--sf-border)',
        borderLeft: '2px solid var(--sf-gold)',
    },
    scarlet: {
        background: 'var(--sf-scarlet-bg)',
        border: '1px solid var(--sf-border)',
        borderLeft: '2px solid var(--sf-scarlet)',
    },
    purple: {
        background: 'var(--sf-purple-bg)',
        border: '1px solid var(--sf-border)',
        borderLeft: '2px solid var(--sf-purple)',
    },
}

const paddingMap = {
    none: '0px',
    sm: '12px',
    md: '24px',
    lg: '32px',
}

export function SilkCard({
    variant = 'default',
    children,
    className,
    style,
    padding = 'md',
}: SilkCardProps) {
    return (
        <div
            className={cn(className)}
            style={{
                borderRadius: 0,
                ...variantStyles[variant],
                padding: paddingMap[padding],
                ...style,
            }}
        >
            {children}
        </div>
    )
}

/** SilkCardHeader — consistent section header inside a card */
export function SilkCardHeader({
    title,
    subtitle,
    action,
    className,
}: {
    title: string
    subtitle?: string
    action?: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
            <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--sf-text)', margin: 0, letterSpacing: '-0.01em' }}>
                    {title}
                </h3>
                {subtitle && (
                    <p style={{ fontSize: '12px', color: 'var(--sf-text-muted)', margin: '4px 0 0 0' }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    )
}
