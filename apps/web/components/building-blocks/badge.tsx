import { cn } from '@puckora/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'brand'
type BadgeSize = 'sm' | 'md'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant
    size?: BadgeSize
}

const VARIANT_MAP: Record<BadgeVariant, string> = {
    default: 'bg-[color:var(--surface-secondary)] text-[color:var(--text-secondary)] border border-[color:var(--border-default)]',
    brand: 'bg-[color:var(--brand-primary-subtle)] text-[color:var(--text-brand)]',
    success: 'bg-[color:var(--surface-success)] text-[color:var(--text-success)]',
    warning: 'bg-[color:var(--surface-warning)] text-[color:var(--text-warning)]',
    error: 'bg-[color:var(--surface-error)] text-[color:var(--text-error)]',
    info: 'bg-[color:var(--surface-info)] text-[color:var(--text-info)]',
}

const SIZE_MAP: Record<BadgeSize, string> = {
    sm: 'px-[var(--space-1-5)] py-[0.125rem] text-[length:var(--text-xs)]',
    md: 'px-[var(--space-2)] py-[0.25rem] text-[length:var(--text-xs)]',
}

export function Badge({
    variant = 'default',
    size = 'sm',
    className,
    children,
    ...props
}: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center font-medium',
                VARIANT_MAP[variant],
                SIZE_MAP[size],
                className,
            )}
            {...props}
        >
            {children}
        </span>
    )
}
