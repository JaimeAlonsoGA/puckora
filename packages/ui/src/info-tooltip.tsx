import { cn } from '@puckora/utils'
import { Caption } from './typography'

// ---------------------------------------------------------------------------
// InfoTooltip
//
// A small circular "?" trigger that reveals a dark popover on hover or
// keyboard focus. Fully CSS-driven (group-hover + group-focus-within):
// no JS, safe for SSR, no external dependency.
//
// Usage:
//   <InfoTooltip
//     title="Median, not average"
//     description={<>Computed from <code>price</code> across 50 sampled products.</>}
//   />
//
// Compose inline with a label row:
//   <div className="flex items-center gap-1.5">
//     <Caption>Median price</Caption>
//     <InfoTooltip title="Why median?" description="Resistant to outliers." />
//   </div>
// ---------------------------------------------------------------------------

type InfoTooltipProps = {
    title: string
    description: React.ReactNode
    /** Tooltip popover position relative to the trigger. */
    position?: 'right' | 'left'
    className?: string
}

export function InfoTooltip({
    title,
    description,
    position = 'right',
    className,
}: InfoTooltipProps) {
    return (
        <span
            className={cn('group relative inline-flex items-center', className)}
            // Keyboard-accessible: focuses the group so focus-within works
            tabIndex={0}
            aria-label={title}
        >
            {/* Trigger */}
            <span
                aria-hidden="true"
                className={cn(
                    'inline-flex size-3.5 items-center justify-center rounded-full',
                    'border border-border text-faint cursor-help select-none',
                    'text-[8px] font-semibold leading-none',
                )}
            >
                ?
            </span>

            {/* Popover — invisible until group is hovered or focused */}
            <span
                role="tooltip"
                className={cn(
                    'pointer-events-none absolute z-20 w-52',
                    'rounded-lg bg-important px-3 py-2 shadow-md',
                    'opacity-0 invisible transition-opacity duration-150',
                    'group-hover:opacity-100 group-hover:visible',
                    'group-focus-within:opacity-100 group-focus-within:visible',
                    position === 'right' ? 'left-5 top-0' : 'right-5 top-0',
                )}
            >
                <Caption
                    as="p"
                    className="font-medium text-important-fg mb-1 leading-snug"
                >
                    {title}
                </Caption>
                <Caption
                    as="p"
                    className="text-important-fg-2 leading-relaxed"
                >
                    {description}
                </Caption>
            </span>
        </span>
    )
}
