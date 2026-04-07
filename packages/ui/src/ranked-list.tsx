import { cn } from '@puckora/utils'
import { Caption, Mono } from './typography'

/**
 * RankedList — vertically stacked numbered rows with a name and value.
 * The first item uses full text-foreground; subsequent items are muted.
 * Rows are separated by top hairline borders applied via CSS sibling selector.
 *
 * Usage:
 *   <RankedList>
 *     <RankedListItem rank={1} name="Home & Kitchen" value="412" highlight />
 *     <RankedListItem rank={2} name="Pet Supplies"   value="198" />
 *     <RankedListItem rank={3} name="Sports & Outdoors" value="87" />
 *   </RankedList>
 */
type RankedListItemProps = {
    rank: number
    name: string
    value: string | number
    /** Optional subtitle shown below the name in smaller, dimmer text. */
    sub?: string
    /** Renders rank and name at full text-foreground weight. */
    highlight?: boolean
    className?: string
}

type RankedListProps = {
    children: React.ReactNode
    className?: string
}

export function RankedList({ children, className }: RankedListProps) {
    return (
        <div className={cn('flex flex-col [&>*+*]:border-t-hairline', className)}>
            {children}
        </div>
    )
}

export function RankedListItem({
    rank,
    name,
    value,
    sub,
    highlight = false,
    className,
}: RankedListItemProps) {
    return (
        <div className={cn('flex items-center gap-2 py-1.5', className)}>
            {/* Rank number — near-invisible, position tells the story */}
            <Mono
                as="span"
                className="w-4 shrink-0 text-xs tabular-nums text-faint"
            >
                {rank}
            </Mono>

            {/* Name + optional subtitle */}
            <div className="min-w-0 flex-1">
                <Caption
                    as="span"
                    className={cn(
                        'block truncate',
                        highlight ? 'font-medium text-foreground' : 'text-muted-foreground',
                    )}
                >
                    {name}
                </Caption>
                {sub && (
                    <Caption as="span" className="block truncate text-xs text-faint">
                        {sub}
                    </Caption>
                )}
            </div>

            {/* Count / value — faint mono, right-aligned */}
            <Mono as="span" className="shrink-0 text-xs">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </Mono>
        </div>
    )
}
