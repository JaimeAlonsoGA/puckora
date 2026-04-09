import { cn } from '@puckora/utils'
import { Caption } from './typography'
import { InfoTooltip } from './info-tooltip'

/**
 * DataCard — rounded analytics card. Replaces the deprecated sharp-edged style.
 * Spatial contract: px-3.5 py-3 bg-card flex flex-col.
 *
 * Tooltip (optional): renders an inline "?" button next to the title.
 *
 * Usage:
 *   <DataCard title="Price Distribution">…</DataCard>
 *   <DataCard title="Median price" tooltip={{ title: "Median, not average", description: "…" }}>…</DataCard>
 *   <DataCard title="Top Categories" className="col-span-2">…</DataCard>
 */
type DataCardProps = React.HTMLAttributes<HTMLDivElement> & {
    title?: string
    /** Optional inline tooltip shown via InfoTooltip next to the title. */
    tooltip?: { title: string; description: React.ReactNode }
    /** Optional action element rendered on the right side of the card header. */
    headerAction?: React.ReactNode
}

export function DataCard({ title, tooltip, headerAction, className, children, ...props }: DataCardProps) {
    return (
        <div
            className={cn(
                'rounded-md px-3.5 py-3 bg-card flex flex-col',
                className,
            )}
            {...props}
        >
            {(title || tooltip || headerAction) && (
                <div className="mb-2.5 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                        {title && (
                            <Caption
                                as="p"
                                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            >
                                {title}
                            </Caption>
                        )}
                        {tooltip && (
                            <InfoTooltip
                                title={tooltip.title}
                                description={tooltip.description}
                            />
                        )}
                    </div>
                    {headerAction}
                </div>
            )}
            {children}
        </div>
    )
}
