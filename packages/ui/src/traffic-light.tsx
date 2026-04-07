import { cn } from '@puckora/utils'
import { Caption } from './typography'

/**
 * TrafficLight — a vertically stacked list of signal rows, each showing a
 * coloured dot (green / amber / red) alongside a label and status word.
 *
 * Usage:
 *   <TrafficLight>
 *     <TrafficLightRow label="FBA viable" status="yes" variant="green" />
 *     <TrafficLightRow label="Review wall" status="moderate" variant="amber" />
 *     <TrafficLightRow label="Competition" status="high" variant="red" />
 *   </TrafficLight>
 */
export type TrafficLightVariant = 'green' | 'amber' | 'red'

type TrafficLightRowProps = {
    label: string
    status: string
    variant: TrafficLightVariant
    className?: string
}

type TrafficLightProps = {
    children: React.ReactNode
    className?: string
}

const DOT_CLASSES: Record<TrafficLightVariant, string> = {
    green: 'bg-success-fg',
    amber: 'bg-warning-fg',
    red: 'bg-error-fg',
}

const STATUS_TEXT_CLASSES: Record<TrafficLightVariant, string> = {
    green: 'text-success-fg',
    amber: 'text-warning-fg',
    red: 'text-error-fg',
}

export function TrafficLight({ children, className }: TrafficLightProps) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            {children}
        </div>
    )
}

export function TrafficLightRow({
    label,
    status,
    variant,
    className,
}: TrafficLightRowProps) {
    return (
        <div className={cn('flex items-center justify-between py-0.5', className)}>
            {/* Label whispers — muted, not full foreground */}
            <Caption as="span" className="text-muted-foreground">
                {label}
            </Caption>

            <div className="flex items-center gap-1.5">
                <span
                    aria-hidden="true"
                    className={cn('size-2 shrink-0 rounded-full', DOT_CLASSES[variant])}
                />
                <Caption as="span" className={cn('text-xs font-semibold', STATUS_TEXT_CLASSES[variant])}>
                    {status}
                </Caption>
            </div>
        </div>
    )
}
