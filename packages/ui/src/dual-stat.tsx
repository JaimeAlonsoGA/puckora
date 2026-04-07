import { cn } from '@puckora/utils'
import { Caption } from './typography'

type DualStatProps = {
    primaryValue: React.ReactNode
    secondaryValue: React.ReactNode
    subtitle?: React.ReactNode[]
    primaryLabel?: string
    secondaryLabel?: string
    className?: string
}

export function DualStat({
    primaryValue,
    secondaryValue,
    subtitle,
    primaryLabel,
    secondaryLabel,
    className,
}: DualStatProps) {
    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-px">
                    <span className="font-mono text-2xl font-medium leading-none text-foreground tabular-nums">
                        {primaryValue}
                    </span>
                    {primaryLabel && <Caption as="span" className="text-faint">{primaryLabel}</Caption>}
                </div>
                <div className="flex flex-col gap-px">
                    <span className="font-mono text-2xl font-medium leading-none text-foreground tabular-nums">
                        {secondaryValue}
                    </span>
                    {secondaryLabel && <Caption as="span" className="text-faint">{secondaryLabel}</Caption>}
                </div>
            </div>

            {subtitle && subtitle.length > 0 ? (
                <div className="flex flex-col gap-1 border-t-hairline pt-2.5">
                    {subtitle.map((line, i) => (
                        <Caption key={i} as="p" className="text-faint">{line}</Caption>
                    ))}
                </div>
            ) : null}
        </div>
    )
}