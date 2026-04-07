import { cn } from '@puckora/utils'
import { Caption, Mono } from './typography'

/**
 * HeroStat — prominent value with optional label and sub-text.
 *
 * Sizes:
 *   compact=false (default) — text-4xl, standalone hero metric
 *   compact=true            — text-2xl, fits inside a compact DataCard grid
 *
 * Usage:
 *   <HeroStat value="$34.50" sub="range $8–$220" />
 *   <HeroStat compact value={<AnimatedMonoNumber ... />} sub="21% of market" />
 *   <HeroStat label="Gross revenue" value={...} accent />
 */
type HeroStatProps = {
    /** Optional section label above the value. Omit when the parent DataCard title is enough. */
    label?: string
    value: React.ReactNode
    sub?: React.ReactNode[]
    /** Applies text-primary to the value. */
    accent?: boolean
    /** Use text-3xl instead of text-4xl for compact card grids. */
    compact?: boolean
    valueClassName?: string
    className?: string
}

export function HeroStat({
    label,
    value,
    sub,
    accent = false,
    compact = false,
    valueClassName,
    className,
}: HeroStatProps) {
    const primitiveValue = typeof value === 'string' || typeof value === 'number'
    const valueColorClass = accent ? 'text-primary' : 'text-foreground'
    const valueSizeClass = compact ? 'text-3xl' : 'text-4xl'

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            {label && (
                <Caption
                    as="p"
                    className="text-xs font-semibold uppercase tracking-widest text-faint"
                >
                    {label}
                </Caption>
            )}

            {primitiveValue ? (
                <Mono
                    as="p"
                    className={cn(
                        'font-medium leading-none tabular-nums transition-colors duration-300',
                        valueSizeClass,
                        valueColorClass,
                        valueClassName,
                    )}
                >
                    {value}
                </Mono>
            ) : (
                <span
                    className={cn(
                        'font-mono font-medium leading-none tabular-nums transition-colors duration-300',
                        valueSizeClass,
                        valueColorClass,
                        valueClassName,
                    )}
                >
                    {value}
                </span>
            )}

            {sub && sub.map((item, index) => (
                <Caption key={index} as="p" className="text-faint">
                    {item}
                </Caption>
            ))}
        </div>
    )
}
