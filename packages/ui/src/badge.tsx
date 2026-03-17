import { cn } from '@puckora/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'brand'
type BadgeSize = 'sm' | 'md'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant
    size?: BadgeSize
}

const VARIANT_MAP: Record<BadgeVariant, string> = {
    default: 'bg-muted text-muted-foreground border border-border',
    brand: 'bg-brand-subtle text-primary',
    success: 'bg-success-surface text-success-fg',
    warning: 'bg-warning-surface text-warning-fg',
    error: 'bg-error-surface text-error-fg',
    info: 'bg-info-surface text-info-fg',
}

const SIZE_MAP: Record<BadgeSize, string> = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-xs',
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
                'rounded-md inline-flex items-center font-medium',
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
