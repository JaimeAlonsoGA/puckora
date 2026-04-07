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
    value: React.ReactNode
    sub?: React.ReactNode
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
    const primitiveValue = typeof value === 'string' || typeof value === 'number'
    const primitiveSub = typeof sub === 'string' || typeof sub === 'number'

    return (
        <div
            className={cn('bg-card rounded-none px-3.5 py-3 flex flex-col', className)}
            {...props}
        >
            {/* Label whispers — maximises value impact */}
            <Caption as="p" className="mb-1 text-xs font-semibold uppercase tracking-widest text-faint">{label}</Caption>
            {primitiveValue ? (
                <Mono
                    as="p"
                    className={cn(
                        'text-2xl font-medium leading-none tabular-nums tracking-tight',
                        accent ? 'text-primary' : 'text-foreground',
                        valueClassName,
                    )}
                >
                    {value}
                </Mono>
            ) : value}
            {sub ? (primitiveSub ? <Caption as="p" className="mt-1 text-xs text-faint">{sub}</Caption> : sub) : null}
        </div>
    )
}
