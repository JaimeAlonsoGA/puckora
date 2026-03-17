import { cn } from '@puckora/utils'
import { Caption } from './typography'

/**
 * DataCard — bordered data section for analytics panels.
 * Encapsulates: border-hairline rounded-lg px-3.5 py-3 bg-background.
 *
 * Usage:
 *   <DataCard title="Price Distribution">…</DataCard>
 *   <DataCard title="Top Categories" className="col-span-2">…</DataCard>
 */
type DataCardProps = React.HTMLAttributes<HTMLDivElement> & {
    title?: string
}

export function DataCard({ title, className, children, ...props }: DataCardProps) {
    return (
        <div
            className={cn(
                'border-hairline rounded-lg px-3.5 py-3 bg-background flex flex-col',
                className,
            )}
            {...props}
        >
            {title && (
                <Caption as="p" className="mb-2 font-medium tracking-[.03em]">
                    {title}
                </Caption>
            )}
            {children}
        </div>
    )
}
