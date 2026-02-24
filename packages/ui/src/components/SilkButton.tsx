import React from 'react'
import { cn } from '@repo/utils'

/**
 * SilkButton — Action element.
 *
 * Rules:
 * - Zero border-radius
 * - CSS variables only — no hardcoded colors
 * - Hover transitions only on action buttons (primary, secondary, gold, danger)
 * - Ghost and outline buttons have no transition
 */

export type SilkButtonVariant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger' | 'outline'
export type SilkButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export interface SilkButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: SilkButtonVariant
    size?: SilkButtonSize
    icon?: React.ReactNode
    iconPosition?: 'left' | 'right'
    loading?: boolean
    children?: React.ReactNode
    fullWidth?: boolean
}

const Spinner = ({ size }: { size: number }) => (
    <svg
        className="animate-spin shrink-0"
        style={{ width: size, height: size }}
        fill="none"
        viewBox="0 0 24 24"
    >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
)

const base =
    'inline-flex items-center justify-center font-medium tracking-tight ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ' +
    'disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer'

// Inline styles use CSS variables exclusively.
// Transition only on action variants (primary, secondary, gold, danger).
type VariantStyle = {
    style: React.CSSProperties
    hoverStyle: React.CSSProperties
}

const variantBase: Record<SilkButtonVariant, React.CSSProperties> = {
    primary: {
        background: 'var(--sf-gold)',
        color: 'var(--sf-text-inv)',
        border: 'none',
        transition: 'background-color 120ms ease',
    },
    secondary: {
        background: 'var(--sf-surface)',
        color: 'var(--sf-text)',
        border: '1px solid var(--sf-border)',
        transition: 'background-color 120ms ease, border-color 120ms ease',
    },
    ghost: {
        background: 'transparent',
        color: 'var(--sf-text-sub)',
        border: 'none',
    },
    gold: {
        background: 'var(--sf-gold)',
        color: 'var(--sf-text-inv)',
        border: 'none',
        fontWeight: 600,
        transition: 'background-color 120ms ease',
    },
    danger: {
        background: 'var(--sf-scarlet)',
        color: 'var(--sf-text-inv)',
        border: 'none',
        transition: 'background-color 120ms ease',
    },
    outline: {
        background: 'transparent',
        color: 'var(--sf-gold)',
        border: '1px solid var(--sf-gold)',
    },
}

const sizeClasses: Record<SilkButtonSize, string> = {
    xs: 'px-2.5 py-1 text-xs gap-1',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
}

const iconPx: Record<SilkButtonSize, number> = { xs: 12, sm: 14, md: 16, lg: 18 }

export function SilkButton({
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    loading = false,
    children,
    className,
    disabled,
    fullWidth,
    style,
    ...props
}: SilkButtonProps) {
    const px = iconPx[size]
    const iconEl = icon
        ? React.cloneElement(icon as React.ReactElement<{ size?: number; className?: string }>, {
            size: px,
            className: 'shrink-0',
        })
        : null

    const [hovered, setHovered] = React.useState(false)

    const hoverOverrides: Partial<Record<SilkButtonVariant, React.CSSProperties>> = {
        primary: { background: 'var(--sf-gold-dark)' },
        secondary: { background: 'var(--sf-surface-alt)', borderColor: 'var(--sf-border-strong)' },
        gold: { background: 'var(--sf-gold-dark)' },
        danger: { background: 'var(--sf-scarlet-dark)' },
    }

    const computedStyle: React.CSSProperties = {
        borderRadius: 0,
        ...variantBase[variant],
        ...(hovered && hoverOverrides[variant] ? hoverOverrides[variant] : {}),
        ...style,
    }

    return (
        <button
            className={cn(base, sizeClasses[size], fullWidth && 'w-full', className)}
            style={computedStyle}
            disabled={disabled || loading}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            {...props}
        >
            {loading && iconPosition === 'left' && <Spinner size={px} />}
            {!loading && icon && iconPosition === 'left' && iconEl}
            {children && <span>{children}</span>}
            {!loading && icon && iconPosition === 'right' && iconEl}
            {loading && iconPosition === 'right' && <Spinner size={px} />}
        </button>
    )
}
