import { cn } from '@puckora/utils'

type SegmentedTimelineSegment = {
    id: string
    label: string
    value: number
    className: string
}

type SegmentedTimelineProps = {
    segments: SegmentedTimelineSegment[]
    className?: string
}

export function SegmentedTimeline({ segments, className }: SegmentedTimelineProps) {
    const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)

    if (total <= 0) {
        return <div className={cn('h-8 rounded-full bg-muted/40', className)} aria-hidden="true" />
    }

    return (
        <div className={cn('flex h-8 overflow-hidden rounded-full bg-muted/30', className)}>
            {segments.map((segment) => {
                const normalizedValue = Math.max(0, segment.value)
                const pct = (normalizedValue / total) * 100

                if (normalizedValue <= 0) {
                    return null
                }

                return (
                    <div
                        key={segment.id}
                        className={cn(
                            'flex min-w-0 items-center justify-center px-2 text-xs font-medium whitespace-nowrap text-white/90',
                            segment.className,
                        )}
                        style={{ width: `${pct}%` }}
                        title={`${segment.label} · ${Math.round(pct)}%`}
                    >
                        <span className="truncate">{segment.label}</span>
                    </div>
                )
            })}
        </div>
    )
}