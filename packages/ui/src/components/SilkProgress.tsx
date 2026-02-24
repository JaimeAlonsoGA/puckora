import React from 'react'
import { cn } from '@repo/utils'

/**
 * SilkProgress — Linear progress indicator.
 *
 * Rules:
 * - Zero border-radius
 * - CSS variables only
 * - No animation on the track itself, only on the fill via width transition
 */

export type SilkProgressVariant = 'gold' | 'scarlet' | 'purple' | 'success' | 'warning' | 'error' | 'info'

export interface SilkProgressProps {
    value: number
    max?: number
    variant?: SilkProgressVariant
    label?: string
    showLabel?: boolean
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const fillColor: Record<SilkProgressVariant, string> = {
    gold: 'var(--sf-gold)',
    scarlet: 'var(--sf-scarlet)',
    purple: 'var(--sf-purple)',
    success: 'var(--sf-success)',
    warning: 'var(--sf-warning)',
    error: 'var(--sf-error)',
    info: 'var(--sf-info)',
}

const heightMap = { sm: '3px', md: '6px', lg: '10px' }

export function SilkProgress({
    value,
    max = 100,
    variant = 'gold',
    label,
    showLabel = false,
    size = 'md',
    className,
}: SilkProgressProps) {
    const pct = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            {(label || showLabel) && (
                <div className="flex justify-between items-center">
                    {label && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {label}
                        </span>
                    )}
                    {showLabel && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-sub)', fontFamily: 'monospace' }}>
                            {Math.round(pct)}%
                        </span>
                    )}
                </div>
            )}
            <div
                style={{
                    background: 'var(--sf-surface-alt)',
                    height: heightMap[size],
                    borderRadius: 0,
                    overflow: 'hidden',
                    border: '1px solid var(--sf-border)',
                }}
            >
                <div
                    style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: fillColor[variant],
                        borderRadius: 0,
                        transition: 'width 300ms ease',
                    }}
                />
            </div>
        </div>
    )
}
