import { cn } from '@puckora/utils'
import { Caption, Mono } from './typography'

// ---------------------------------------------------------------------------
// BarChart / BarChartRow
//
// Horizontal bar chart for distribution data (price buckets, category shares).
// Supports a "highlight" row (sweet spot / strategy band) with distinct color.
// Entirely CSS-driven — no canvas, no SVG. Safe for SSR and the extension.
//
// Usage:
//   <BarChart>
//     <BarChartRow label="$10–25" value={12} />
//     <BarChartRow label="$25–45" value={44} highlight label="sweet spot" />
//     <BarChartRow label="$45–65" value={28} />
//   </BarChart>
// ---------------------------------------------------------------------------

type BarChartRowProps = {
    /** The axis label shown on the left (e.g. price range, category name) */
    label: string
    /** Percentage fill 0–100 */
    value: number
    /** Draws a distinct highlighted bar (sweet spot / strategy band) */
    highlight?: boolean
    /** Optional badge label shown after the percentage (e.g. "sweet spot") */
    badge?: string
    className?: string
}

export function BarChartRow({ label, value, highlight = false, badge, className }: BarChartRowProps) {
    const clamped = Math.min(100, Math.max(0, value))

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {/* Axis label */}
            <Mono as="span" className="w-14 shrink-0 text-xs text-muted-foreground text-right tabular-nums">
                {label}
            </Mono>

            {/* Track + fill */}
            <div className="relative h-1.5 flex-1 rounded-full bg-muted/40 overflow-hidden">
                <div
                    className={cn(
                        'absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out',
                        highlight ? 'bg-primary' : 'bg-muted-foreground/25',
                    )}
                    style={{ width: `${clamped}%` }}
                    aria-hidden="true"
                />
            </div>

            {/* Percentage value */}
            <Caption as="span" className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                {Math.round(clamped)}%
            </Caption>

            {/* Sweet-spot chip — tiny inline annotation matching ValueChip style */}
            {badge && (
                <span className="inline-flex items-center rounded-sm bg-brand-subtle px-1.5 py-0.5 text-xs font-semibold leading-none text-primary whitespace-nowrap">
                    {badge}
                </span>
            )}
        </div>
    )
}

type BarChartProps = React.HTMLAttributes<HTMLDivElement>

export function BarChart({ className, children, ...props }: BarChartProps) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)} {...props}>
            {children}
        </div>
    )
}
