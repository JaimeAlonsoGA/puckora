import { cn } from '@puckora/utils'
import { Caption, Mono } from './typography'

// ---------------------------------------------------------------------------
// SideBySide
//
// Two equal-width comparison cells in a horizontal row, separated by a
// hairline divider. Designed to sit inside a DataCard (inherits horizontal
// padding from parent).
//
// Usage:
//   <SideBySide>
//     <SideBySideItem value="847" label="Competing brands" sub="unique sellers" />
//     <SideBySideItem value="18" label="New (<18mo)" sub="market entry" />
//   </SideBySide>
// ---------------------------------------------------------------------------

type SideBySideItemProps = {
    value: React.ReactNode
    label: string
    sub?: string
    className?: string
}

export function SideBySide({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('grid grid-cols-2 gap-2', className)}>
            {children}
        </div>
    )
}

export function SideBySideItem({ value, label, sub, className }: SideBySideItemProps) {
    return (
        <div className={cn('flex flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2', className)}>
            {/* Label above the value — matches canvas cell layout */}
            <Caption
                as="p"
                className="text-xs font-semibold uppercase tracking-widest text-faint"
            >
                {label}
            </Caption>
            <Mono
                as="p"
                className="text-xl font-medium tabular-nums text-foreground leading-tight"
            >
                {value}
            </Mono>
            {sub && (
                <Caption as="p" className="text-xs text-faint">
                    {sub}
                </Caption>
            )}
        </div>
    )
}
