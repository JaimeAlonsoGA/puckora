import { cn } from '@puckora/utils'

/**
 * ProgressBar — horizontal 0–100 progress indicator.
 * Spatial contract: h-1 rounded-full bg-muted/40 fill bg-success-fg.
 *
 * Usage:
 *   <ProgressBar value={newListingsPct} />
 *   <ProgressBar value={42} className="mt-1.5" />
 */
type ProgressBarProps = {
    /** 0–100 */
    value: number
    className?: string
}

export function ProgressBar({ value, className }: ProgressBarProps) {
    const clamped = Math.min(100, Math.max(0, value))
    return (
        <div
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-hidden="true"
            className={cn('h-1 overflow-hidden rounded-full bg-muted/40', className)}
        >
            <div
                className="h-full rounded-full bg-success-fg transition-[width] duration-500"
                style={{ width: `${clamped}%` }}
            />
        </div>
    )
}
