import { cn } from '@puckora/utils'

/**
 * ListToolbar — horizontal toolbar row for data list/table headers.
 * Encapsulates: flex items-center gap-2 border-b-hairline bg-background px-4 py-2.
 *
 * Usage:
 *   <ListToolbar>
 *     <Button …>Back</Button>
 *     <Caption>/</Caption>
 *     <Caption className="font-medium text-foreground">"lap desk"</Caption>
 *     <Button className="ml-auto" …>Filter</Button>
 *   </ListToolbar>
 */
type ListToolbarProps = React.HTMLAttributes<HTMLDivElement>

export function ListToolbar({ className, children, ...props }: ListToolbarProps) {
    return (
        <div
            className={cn(
                'flex shrink-0 flex-wrap items-center gap-2',
                'border-b-hairline bg-background px-4 py-2',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    )
}
