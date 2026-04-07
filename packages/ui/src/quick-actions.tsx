import { cn } from '@puckora/utils'

// ---------------------------------------------------------------------------
// QuickActions / QuickAction
//
// A wrapping pill-button group for CTAs at the bottom of overview panels.
// Primary action uses bg-cta-default (near-black); secondary pills use the
// card surface with hairline border.
//
// Usage:
//   <QuickActions>
//     <QuickAction onClick={fn} primary>See all 847 products ↗</QuickAction>
//     <QuickAction onClick={fn}>New listings (180)</QuickAction>
//     <QuickAction href="/search/lap-desk?view=products">$60+ range</QuickAction>
//   </QuickActions>
// ---------------------------------------------------------------------------

type QuickActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Makes this the primary (filled) action */
    primary?: boolean
    /** Render as anchor (for navigation) */
    href?: string
    children: React.ReactNode
    className?: string
}

export function QuickAction({ primary = false, href, children, className, ...rest }: QuickActionProps) {
    const classes = cn(
        'inline-flex items-center justify-center whitespace-nowrap',
        'h-9 px-4 text-sm font-medium rounded-full',
        'transition-opacity duration-150 cursor-pointer',
        'border border-border',
        primary
            ? 'bg-cta-default text-cta-default-fg border-transparent hover:opacity-90'
            : 'bg-background text-foreground hover:bg-card',
        className,
    )

    if (href) {
        return (
            <a href={href} className={classes}>
                {children}
            </a>
        )
    }

    return (
        <button type="button" className={classes} {...rest}>
            {children}
        </button>
    )
}

type QuickActionsProps = React.HTMLAttributes<HTMLDivElement>

export function QuickActions({ className, children, ...props }: QuickActionsProps) {
    return (
        <div className={cn('flex flex-wrap gap-2', className)} {...props}>
            {children}
        </div>
    )
}
