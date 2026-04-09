import { cn } from '@/lib/utils'

/**
 * OverviewLayout — two-pane split for detail / overview pages.
 *
 * On mobile: single column, panels stack vertically (each scrolls internally).
 * On xl+: side-by-side, both panels fill the viewport height and scroll
 * independently.
 *
 * Usage:
 *   <OverviewLayout>
 *     <OverviewPanel side="left">…sidebar content…</OverviewPanel>
 *     <OverviewPanel side="right">…main content…</OverviewPanel>
 *   </OverviewLayout>
 */
type OverviewLayoutProps = {
    children: React.ReactNode
    className?: string
}

type OverviewPanelProps = {
    side: 'left' | 'right'
    children: React.ReactNode
    className?: string
}

export function OverviewLayout({ children, className }: OverviewLayoutProps) {
    return (
        <div
            className={cn(
                // Mobile: vertical stack, scrollable as a single column
                'flex flex-1 flex-col gap-3 overflow-y-auto',
                // xl: side-by-side grid — left panel fixed, right fills remaining space
                'xl:grid xl:grid-cols-[260px_1fr] xl:gap-3 xl:overflow-hidden',
                className,
            )}
        >
            {children}
        </div>
    )
}

export function OverviewPanel({ side, children, className }: OverviewPanelProps) {
    return (
        <div
            className={cn(
                'flex flex-col',
                side === 'left' && [
                    'border-b-hairline',                 // mobile: bottom divider between panels
                    'xl:border-b-0 xl:border-r-hairline', // xl: right divider instead
                    'xl:overflow-y-auto',                 // xl: this pane scrolls independently
                ],
                side === 'right' && [
                    'overflow-y-auto',   // always scrollable (the main content column)
                    'p-4',              // consistent inner padding
                ],
                className,
            )}
        >
            {children}
        </div>
    )
}

// ── Named aliases — preferred over side= prop for explicit semantics ──────────

type OverviewSidebarProps = { children: React.ReactNode; className?: string }
export function OverviewSidebar({ children, className }: OverviewSidebarProps) {
    return (
        <aside
            className={cn(
                'flex min-w-0 flex-col xl:overflow-y-auto space-y-4 pl-4 py-4',
                className,
            )}
        >
            {children}
        </aside>
    )
}

type OverviewSidebarActionsProps = { children: React.ReactNode; className?: string }
export function OverviewSidebarActions({ children, className }: OverviewSidebarActionsProps) {
    return (
        <div className={cn('border-t-hairline px-3.5 py-3', className)}>
            {children}
        </div>
    )
}

type OverviewMainProps = { children: React.ReactNode; className?: string }
export function OverviewMain({ children, className }: OverviewMainProps) {
    return (
        <div className={cn('flex flex-col overflow-y-auto p-4 xl:overflow-hidden', className)}>
            {children}
        </div>
    )
}

type OverviewMainContentProps = { children: React.ReactNode; className?: string }
export function OverviewMainContent({ children, className }: OverviewMainContentProps) {
    return (
        <div className={cn('flex w-full flex-col gap-3 xl:flex-1 xl:min-h-0', className)}>
            {children}
        </div>
    )
}
