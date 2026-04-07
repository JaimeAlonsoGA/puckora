import { cn } from '@puckora/utils'
import { Caption, Mono } from './typography'

/**
 * ValueChip — the tiny inline chip that lives beside a stat value.
 * Inspired by the canvas badge: tight padding, color-matched surface, no pill shape.
 *
 * Use anywhere a qualitative signal annotates a number ("high", "sweet", "growing").
 */
type BadgeVariant = 'default' | 'brand' | 'success' | 'warning' | 'error' | 'info'

const CHIP_CLASSES: Record<BadgeVariant, string> = {
    default: 'bg-muted text-muted-foreground',
    brand: 'bg-brand-subtle text-primary',
    success: 'bg-success-surface text-success-fg',
    warning: 'bg-warning-surface text-warning-fg',
    error: 'bg-error-surface text-error-fg',
    info: 'bg-info-surface text-info-fg',
}

type ValueChipProps = {
    children: React.ReactNode
    variant?: BadgeVariant
    className?: string
}

export function ValueChip({ children, variant = 'default', className }: ValueChipProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-sm px-1.5 py-0.5',
                'text-xs font-semibold leading-none',
                CHIP_CLASSES[variant],
                className,
            )}
        >
            {children}
        </span>
    )
}

/**
 * StatBadge — compact value with an inline ValueChip signal.
 * Renders value at text-xl (20px) monospace with a color-matched chip
 * sitting on the value's baseline.
 *
 * Usage:
 *   <StatBadge label="Amazon's cut" value="32%" badge="high" badgeVariant="error" sub="FBA + referral avg" />
 *   <StatBadge label="Avg price" value={<AnimatedMonoNumber ... />} badge="sweet" badgeVariant="success" />
 */
type StatBadgeProps = {
    label: string
    value: React.ReactNode
    badge?: string
    badgeVariant?: BadgeVariant
    sub?: React.ReactNode
    /** Applies text-primary to the value. */
    accent?: boolean
    valueClassName?: string
    className?: string
}

export function StatBadge({
    label,
    value,
    badge,
    badgeVariant = 'default',
    sub,
    accent = false,
    valueClassName,
    className,
}: StatBadgeProps) {
    const primitiveValue = typeof value === 'string' || typeof value === 'number'

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            <Caption
                as="p"
                className="text-xs font-semibold uppercase tracking-widest text-faint"
            >
                {label}
            </Caption>

            <div className="flex items-baseline gap-1.5">
                {primitiveValue ? (
                    <Mono
                        as="p"
                        className={cn(
                            'text-xl font-medium leading-none tabular-nums',
                            accent ? 'text-primary' : 'text-foreground',
                            valueClassName,
                        )}
                    >
                        {value}
                    </Mono>
                ) : (
                    <span
                        className={cn(
                            'font-mono text-xl font-medium leading-none tabular-nums',
                            accent ? 'text-primary' : 'text-foreground',
                            valueClassName,
                        )}
                    >
                        {value}
                    </span>
                )}

                {badge && (
                    <ValueChip variant={badgeVariant}>{badge}</ValueChip>
                )}
            </div>

            {sub && (
                <Caption as="p" className="text-faint">
                    {sub}
                </Caption>
            )}
        </div>
    )
}
