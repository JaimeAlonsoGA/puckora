import { cn } from '@puckora/utils'
import { Caption } from './typography'

/**
 * DotScatterRow — mini histogram of relative-height bins, useful for
 * representing distributions (price spread, review spread, etc.)
 * Bars align to the bottom and are coloured with primary/60 tint.
 * Heights are proportional to the tallest bin in the set.
 *
 * Usage:
 *   <DotScatterRow
 *     label="Review spread"
 *     bins={[5, 18, 60, 80, 55, 30, 14, 6]}
 *     rangeStart="0"
 *     rangeEnd="10k+"
 *   />
 */
type DotScatterRowProps = {
    /** Relative heights 0–100; the tallest bin is always rendered at full height. */
    bins: number[]
    label?: string
    /** Text shown at the left edge of the range axis. */
    rangeStart?: string
    /** Text shown at the right edge of the range axis. */
    rangeEnd?: string
    className?: string
}

export function DotScatterRow({
    bins,
    label,
    rangeStart,
    rangeEnd,
    className,
}: DotScatterRowProps) {
    const max = Math.max(...bins, 1)

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            {label && (
                <Caption
                    as="p"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                    {label}
                </Caption>
            )}

            <div className="flex flex-col gap-0.5">
                {/* Bar chart — bars aligned to the bottom */}
                <div className="flex h-9 items-end gap-0.5">
                    {bins.map((bin, i) => (
                        <div
                            key={i}
                            className="min-w-0 flex-1 rounded-sm bg-primary"
                            style={{
                                height: `${(bin / max) * 100}%`,
                                // Taller bins are more saturated; edges fade to ~15%
                                opacity: (bin / max) * 0.85 + 0.15,
                            }}
                        />
                    ))}
                </div>

                {/* Axis range labels */}
                {(rangeStart || rangeEnd) && (
                    <div className="flex items-center justify-between">
                        {rangeStart && (
                            <Caption className="text-muted-foreground">{rangeStart}</Caption>
                        )}
                        {rangeEnd && (
                            <Caption className="text-muted-foreground">{rangeEnd}</Caption>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
