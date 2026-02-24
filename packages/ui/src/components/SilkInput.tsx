import React from 'react'
import { cn } from '@repo/utils'

/**
 * SilkInput — Form text input.
 *
 * Rules:
 * - Zero border-radius
 * - CSS variables only
 * - Ultramarine focus ring (--sf-border-strong)
 * - White background
 */

export interface SilkInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    hint?: string
    error?: string
    icon?: React.ReactNode
    iconRight?: React.ReactNode
    fullWidth?: boolean
}

const baseInputStyle: React.CSSProperties = {
    background: 'var(--sf-bg)',
    border: '1px solid var(--sf-border)',
    borderRadius: 0,
    color: 'var(--sf-text)',
    fontSize: '14px',
    lineHeight: '1.5',
    outline: 'none',
    transition: 'border-color 120ms ease',
    width: '100%',
}

export const SilkInput = React.forwardRef<HTMLInputElement, SilkInputProps>(
    ({ label, hint, error, icon, iconRight, fullWidth, className, style, ...props }, ref) => {
        return (
            <div className={cn('flex flex-col gap-1', fullWidth ? 'w-full' : 'w-auto', className)}>
                {label && (
                    <label
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--sf-text-muted)',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                        }}
                    >
                        {label}
                    </label>
                )}
                <div className="relative flex items-center">
                    {icon && (
                        <span
                            className="absolute left-3 flex items-center pointer-events-none"
                            style={{ color: 'var(--sf-text-muted)' }}
                        >
                            {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 14 })}
                        </span>
                    )}
                    <input
                        ref={ref}
                        className="outline-none w-full"
                        style={{
                            ...baseInputStyle,
                            padding: icon ? '8px 12px 8px 36px' : '8px 12px',
                            paddingRight: iconRight ? '36px' : '12px',
                            borderColor: error ? 'var(--sf-error)' : 'var(--sf-border)',
                            ...style,
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = error ? 'var(--sf-error)' : 'var(--sf-border-strong)'
                            props.onFocus?.(e)
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = error ? 'var(--sf-error)' : 'var(--sf-border)'
                            props.onBlur?.(e)
                        }}
                        {...props}
                    />
                    {iconRight && (
                        <span
                            className="absolute right-3 flex items-center pointer-events-none"
                            style={{ color: 'var(--sf-text-muted)' }}
                        >
                            {React.cloneElement(iconRight as React.ReactElement<{ size?: number }>, { size: 14 })}
                        </span>
                    )}
                </div>
                {hint && !error && (
                    <span style={{ fontSize: '11px', color: 'var(--sf-text-muted)' }}>{hint}</span>
                )}
                {error && (
                    <span style={{ fontSize: '11px', color: 'var(--sf-error)' }}>{error}</span>
                )}
            </div>
        )
    }
)
SilkInput.displayName = 'SilkInput'
