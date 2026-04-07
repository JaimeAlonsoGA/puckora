import { cn } from '@puckora/utils'
import { Caption, Mono } from './typography'

// ---------------------------------------------------------------------------
// NicheScoreCard
//
// The hero card for a search/niche overview — inverted surface (dark in light
// mode, light in dark mode) that anchors the left column of a results page.
//
// Slot areas:
//   • title       — niche keyword, large
//   • subtitle    — e.g. "847 products · 50 sampled"
//   • children    — tl-row style stat rows (use NicheStatRow inside)
//   • className   — forwarded to outer div
//
// Usage:
//   <NicheScoreCard title="lap desk" subtitle="847 products · 50 sampled">
//     <NicheStatRow label="Avg revenue" value="$12,400" accent />
//     <NicheStatRow label="Avg price" value="$34" />
//   </NicheScoreCard>
// ---------------------------------------------------------------------------

type NicheScoreCardProps = React.HTMLAttributes<HTMLDivElement> & {
    title: string
    subtitle?: string
}

export function NicheScoreCard({ title, subtitle, className, children, ...props }: NicheScoreCardProps) {
    return (
        <div
            className={cn(
                'bg-important text-important-fg rounded-none px-4 py-3.5 flex flex-col',
                className,
            )}
            {...props}
        >
            <div className="mb-3">
                <Mono
                    as="h2"
                    className="text-xl font-medium text-important-fg leading-tight mb-1 line-clamp-2"
                >
                    &ldquo;{title}&rdquo;
                </Mono>
                {subtitle && (
                    <Caption as="p" className="text-important-fg-2">
                        {subtitle}
                    </Caption>
                )}
            </div>
            <div className="flex flex-col divide-y divide-white/10">
                {children}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// NicheStatRow
//
// One key-value row inside NicheScoreCard.
// ---------------------------------------------------------------------------

type NicheStatRowProps = {
    label: string
    value: React.ReactNode
    /** Applies brand-green color to the value */
    accent?: boolean
    className?: string
}

export function NicheStatRow({ label, value, accent = false, className }: NicheStatRowProps) {
    return (
        <div className={cn('flex items-center justify-between py-2', className)}>
            <Caption as="span" className="text-important-fg-2">
                {label}
            </Caption>
            {typeof value === 'string' || typeof value === 'number' ? (
                <Mono
                    as="span"
                    className={cn(
                        'text-sm font-medium',
                        accent ? 'text-cta-engage' : 'text-important-fg',
                    )}
                >
                    {value}
                </Mono>
            ) : (
                value
            )}
        </div>
    )
}
