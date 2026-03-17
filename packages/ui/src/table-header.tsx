import { cn } from '@puckora/utils'

/**
 * TableHeader — sticky column header row for data tables.
 * Encapsulates: grid shrink-0 gap-1.5 border-b-hairline-default bg-background px-4 py-1.75.
 * Consumer passes gridClassName for the CSS grid template (e.g. "product-row-grid").
 *
 * Usage:
 *   <TableHeader gridClassName="product-row-grid">
 *     {columns.map(col => <span key={col}>{col}</span>)}
 *   </TableHeader>
 */
type TableHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
    gridClassName?: string
}

export function TableHeader({ gridClassName, className, children, ...props }: TableHeaderProps) {
    return (
        <div
            className={cn(
                'grid shrink-0 gap-1.5',
                'border-b-hairline-default bg-background px-4 py-1.75',
                gridClassName,
                className,
            )}
            {...props}
        >
            {children}
        </div>
    )
}

/**
 * TableHeaderCell — individual column header cell.
 * Encapsulates: flex cursor-pointer select-none items-center gap-0.5 text-sm font-medium text-faint whitespace-nowrap.
 */
type TableHeaderCellProps = React.HTMLAttributes<HTMLDivElement>

export function TableHeaderCell({ className, children, ...props }: TableHeaderCellProps) {
    return (
        <div
            className={cn(
                'flex cursor-pointer select-none items-center gap-0.5',
                'overflow-hidden text-sm font-medium text-faint whitespace-nowrap',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    )
}
