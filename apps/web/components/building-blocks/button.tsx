'use client'

import { cn } from '@puckora/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    ref?: React.Ref<HTMLButtonElement>
    variant?: ButtonVariant
    size?: ButtonSize
    icon?: React.ReactNode
    iconRight?: React.ReactNode
    loading?: boolean
    fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: [
        'bg-[color:var(--brand-primary)] text-[color:var(--text-inverse)]',
        'hover:bg-[color:var(--brand-primary-hover)]',
        'active:bg-[color:var(--brand-primary-active)]',
        'focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-base)]',
    ].join(' '),
    secondary: [
        'bg-[color:var(--surface-card)] text-[color:var(--text-primary)]',
        'border border-[color:var(--border-default)]',
        'hover:bg-[color:var(--surface-hover)]',
        'active:bg-[color:var(--surface-active)]',
        'focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-base)]',
    ].join(' '),
    ghost: [
        'bg-transparent text-[color:var(--text-secondary)]',
        'hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text-primary)]',
        'active:bg-[color:var(--surface-active)]',
        'focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
    ].join(' '),
    danger: [
        'bg-[color:var(--error)] text-[color:var(--text-inverse)]',
        'hover:bg-red-600',
        'active:bg-red-700',
        'focus-visible:ring-2 focus-visible:ring-[color:var(--border-error)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-base)]',
    ].join(' '),
    outline: [
        'bg-transparent text-[color:var(--text-brand)]',
        'border border-[color:var(--brand-primary)]',
        'hover:bg-[color:var(--brand-primary-subtle)]',
        'active:bg-[color:var(--brand-primary-subtle)]',
        'focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
    ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-[length:var(--text-sm)] gap-1.5 rounded-[var(--radius-md)]',
    md: 'h-10 px-4 text-[length:var(--text-sm)] gap-2 rounded-[var(--radius-md)]',
    lg: 'h-12 px-6 text-[length:var(--text-base)] gap-2.5 rounded-[var(--radius-lg)]',
}

export function Button({
    ref,
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    loading = false,
    fullWidth = false,
    disabled,
    className,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center justify-center font-medium',
                'transition-all duration-[var(--transition-fast)]',
                'select-none whitespace-nowrap',
                'disabled:pointer-events-none disabled:opacity-50',
                variantStyles[variant],
                sizeStyles[size],
                fullWidth && 'w-full',
                className,
            )}
            {...props}
        >
            {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
                icon
            )}
            {children}
            {iconRight}
        </button>
    )
}
