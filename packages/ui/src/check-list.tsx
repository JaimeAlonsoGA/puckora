import { cn } from '@puckora/utils'
import { Caption } from './typography'

// ---------------------------------------------------------------------------
// CheckList / CheckItem
//
// A visual list of pass/warn/fail checks used in niche quick-check panels.
// Typically placed inside a DataCard.
//
// Usage:
//   <DataCard title="Quick checks">
//     <CheckList>
//       <CheckItem status="pass">Under 1 kg avg weight</CheckItem>
//       <CheckItem status="warn">High review wall</CheckItem>
//       <CheckItem status="fail">32% Amazon cut</CheckItem>
//       <CheckItem status="info">180 new listings</CheckItem>
//     </CheckList>
//   </DataCard>
// ---------------------------------------------------------------------------

type CheckStatus = 'pass' | 'warn' | 'fail' | 'info'
type CheckTone = 'icon' | 'full'

type CheckItemProps = React.HTMLAttributes<HTMLDivElement> & {
    status: CheckStatus
    tone?: CheckTone
    children: React.ReactNode
}

const STATUS_CONFIG: Record<CheckStatus, { icon: string; color: string }> = {
    pass: { icon: '✓', color: 'text-success-fg' },
    warn: { icon: '!', color: 'text-warning-fg' },
    fail: { icon: '✗', color: 'text-error-fg' },
    info: { icon: '·', color: 'text-info-fg' },
}

export function CheckItem({ status, tone = 'icon', children, className, ...props }: CheckItemProps) {
    const cfg = STATUS_CONFIG[status]
    return (
        <div
            className={cn('flex items-center gap-2 py-1.5', className)}
            {...props}
        >
            <span
                className={cn('w-3.5 shrink-0 text-center text-sm font-semibold leading-none', cfg.color)}
                aria-hidden="true"
            >
                {cfg.icon}
            </span>
            <Caption as="span" className={cn(tone === 'full' ? cfg.color : 'text-foreground')}>
                {children}
            </Caption>
        </div>
    )
}

type CheckListProps = React.HTMLAttributes<HTMLDivElement>

export function CheckList({ className, children, ...props }: CheckListProps) {
    return (
        <div
            className={cn('flex flex-col divide-y divide-[var(--border-subtle)]', className)}
            {...props}
        >
            {children}
        </div>
    )
}
