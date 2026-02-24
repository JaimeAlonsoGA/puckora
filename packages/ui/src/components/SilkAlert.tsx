import React from 'react'
import { cn } from '@repo/utils'

/**
 * SilkAlert — Contextual message component.
 *
 * Rules:
 * - Zero border-radius
 * - CSS variables only
 * - Left border accent (2px) for visual category signal
 * - No hover animations
 */

export type SilkAlertVariant = 'info' | 'success' | 'warning' | 'error' | 'gold' | 'purple'

export interface SilkAlertProps {
    variant?: SilkAlertVariant
    title?: string
    children: React.ReactNode
    icon?: React.ReactNode
    onDismiss?: () => void
    className?: string
}

const config: Record<SilkAlertVariant, {
    bg: string
    border: string
    accent: string
    titleColor: string
    textColor: string
}> = {
    info: {
        bg: 'var(--sf-info-bg)',
        border: 'var(--sf-border)',
        accent: 'var(--sf-info)',
        titleColor: 'var(--sf-info)',
        textColor: 'var(--sf-text-sub)',
    },
    success: {
        bg: 'var(--sf-success-bg)',
        border: 'var(--sf-border)',
        accent: 'var(--sf-success)',
        titleColor: 'var(--sf-success)',
        textColor: 'var(--sf-text-sub)',
    },
    warning: {
        bg: 'var(--sf-warning-bg)',
        border: 'var(--sf-border)',
        accent: 'var(--sf-warning)',
        titleColor: 'var(--sf-warning)',
        textColor: 'var(--sf-text-sub)',
    },
    error: {
        bg: 'var(--sf-error-bg)',
        border: 'var(--sf-border)',
        accent: 'var(--sf-error)',
        titleColor: 'var(--sf-error)',
        textColor: 'var(--sf-text-sub)',
    },
    gold: {
        bg: 'var(--sf-gold-bg)',
        border: 'var(--sf-border)',
        accent: 'var(--sf-gold)',
        titleColor: 'var(--sf-gold)',
        textColor: 'var(--sf-text-sub)',
    },
    purple: {
        bg: 'var(--sf-purple-bg)',
        border: 'var(--sf-border)',
        accent: 'var(--sf-purple)',
        titleColor: 'var(--sf-purple)',
        textColor: 'var(--sf-text-sub)',
    },
}

export function SilkAlert({
    variant = 'info',
    title,
    children,
    icon,
    onDismiss,
    className,
}: SilkAlertProps) {
    const c = config[variant]

    return (
        <div
            className={cn(className)}
            style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderLeft: `2px solid ${c.accent}`,
                borderRadius: 0,
                padding: '12px 16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
            }}
        >
            {icon && (
                <span style={{ color: c.accent, flexShrink: 0, paddingTop: '1px' }}>
                    {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 16 })}
                </span>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
                {title && (
                    <div
                        style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: c.titleColor,
                            marginBottom: children ? '4px' : 0,
                        }}
                    >
                        {title}
                    </div>
                )}
                <div style={{ fontSize: '13px', color: c.textColor, lineHeight: '1.5' }}>
                    {children}
                </div>
            </div>

            {onDismiss && (
                <button
                    onClick={onDismiss}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--sf-text-muted)',
                        padding: 0,
                        lineHeight: 1,
                        flexShrink: 0,
                    }}
                >
                    ×
                </button>
            )}
        </div>
    )
}
