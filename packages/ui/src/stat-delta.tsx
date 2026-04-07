import { cn } from '@puckora/utils'
import { Caption, Mono } from './typography'

/**
 * StatDelta — compact value with a directional delta indicator.
 * Shows value at text-xl (20px) monospace with a coloured ↑/↓/→ chip alongside.
 *
 * Usage:
 *   <StatDelta label="Review velocity" value="+18" direction="up" delta="growing" />
 *   <StatDelta label="Avg BSR" value="42,500" direction="down" delta="rising" sub="lower = better" />
 */
export type DeltaDirection = 'up' | 'down' | 'neutral'

type StatDeltaProps = {
    label: string
    value: React.ReactNode
    /** Short descriptor shown next to the arrow (e.g. "growing", "+18/mo"). */
    delta?: string
    direction?: DeltaDirection
    sub?: React.ReactNode
    valueClassName?: string
    className?: string
}

const DIRECTION_CONFIG: Record<DeltaDirection, { arrow: string; colorClass: string }> = {
    up: { arrow: '↑', colorClass: 'text-success-fg' },
    down: { arrow: '↓', colorClass: 'text-error-fg' },
    neutral: { arrow: '→', colorClass: 'text-muted-foreground' },
}

export function StatDelta({
    label,
    value,
    delta,
    direction = 'neutral',
    sub,
    valueClassName,
    className,
}: StatDeltaProps) {
    const { arrow, colorClass } = DIRECTION_CONFIG[direction]
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
                            'text-xl font-medium leading-none tabular-nums text-foreground',
                            valueClassName,
                        )}
                    >
                        {value}
                    </Mono>
                ) : (
                    <span
                        className={cn(
                            'font-mono text-xl font-medium leading-none tabular-nums text-foreground',
                            valueClassName,
                        )}
                    >
                        {value}
                    </span>
                )}

                {delta && (
                    <span className={cn('text-xs font-semibold leading-none tracking-tight', colorClass)}>
                        {arrow} {delta}
                    </span>
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
