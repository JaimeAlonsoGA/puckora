import { cn } from '@puckora/utils'
import { Caption, Mono } from './typography'

/**
 * KpiCard — compact KPI stat tile used in analytics overviews.
 * Encapsulates: bg-card rounded-md px-3 py-2.5 + label / value / sub layout.
 *
 * Usage:
 *   <KpiCard label="Avg Revenue" value="$18,400" sub="top 20" accent />
 *   <KpiCard label="Total Fees" value="$5.20" sub="FBA + ref" valueClassName="text-warning-fg" />
 */
type KpiCardProps = React.HTMLAttributes<HTMLDivElement> & {
    label: string
    value: string
    sub?: string
    /** Applies text-primary to the value. */
    accent?: boolean
    valueClassName?: string
}

export function KpiCard({
    label,
    value,
    sub,
    accent = false,
    valueClassName,
    className,
    ...props
}: KpiCardProps) {
    return (
        <div
            className={cn('bg-card rounded-md px-3 py-2.5 flex flex-col', className)}
            {...props}
        >
            <Caption as="p" className="mb-1">{label}</Caption>
            <Mono
                as="p"
                className={cn(
                    'text-lg font-medium',
                    accent ? 'text-primary' : 'text-foreground',
                    valueClassName,
                )}
            >
                {value}
            </Mono>
            {sub && <Caption as="p" className="mt-0.5 text-xs">{sub}</Caption>}
        </div>
    )
}
