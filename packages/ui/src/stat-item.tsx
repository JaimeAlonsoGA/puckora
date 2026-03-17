import { cn } from '@puckora/utils'
import { Caption, Mono } from './typography'

/**
 * StatItem — label / value / sub column used for expanded product detail panels.
 * The primary value is sized by the parent context via `valueClassName`.
 * Defaults to text-sm value (standard compact context).
 *
 * Usage:
 *   <StatItem label="Monthly Revenue" value="$10,118" sub="units: 289" accent />
 *   <StatItem label="BSR Rank" value="#1,240" sub="9.6/day" />
 */
type StatItemProps = React.HTMLAttributes<HTMLDivElement> & {
    label: string
    value: string
    sub?: string
    accent?: boolean
    valueClassName?: string
}

export function StatItem({
    label,
    value,
    sub,
    accent = false,
    valueClassName,
    className,
    ...props
}: StatItemProps) {
    return (
        <div className={cn('flex flex-col gap-px', className)} {...props}>
            <Caption as="span">{label}</Caption>
            <Mono
                as="span"
                className={cn(
                    'text-sm font-medium',
                    accent ? 'text-primary' : 'text-foreground',
                    valueClassName,
                )}
            >
                {value}
            </Mono>
            {sub && <Caption as="span" className="text-xs">{sub}</Caption>}
        </div>
    )
}
