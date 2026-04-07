import { cn } from '@puckora/utils'
import { Caption, Mono } from './typography'

type ShareStackProps = React.HTMLAttributes<HTMLDivElement>

type ShareStackRowProps = {
    label: string
    value: number
    sub?: React.ReactNode
    highlight?: boolean
    className?: string
}

export function ShareStack({ className, children, ...props }: ShareStackProps) {
    return (
        <div className={cn('flex flex-col gap-2', className)} {...props}>
            {children}
        </div>
    )
}

export function ShareStackRow({
    label,
    value,
    sub,
    highlight = false,
    className,
}: ShareStackRowProps) {
    const clamped = Math.min(100, Math.max(0, value))

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <Caption
                        as="span"
                        className={cn(highlight ? 'font-medium text-foreground' : 'text-muted-foreground')}
                    >
                        {label}
                    </Caption>
                    {sub ? <div className="text-xs text-faint">{sub}</div> : null}
                </div>
                <Mono
                    as="span"
                    className={cn('shrink-0 text-sm font-medium', highlight ? 'text-primary' : 'text-foreground')}
                >
                    {Math.round(clamped)}%
                </Mono>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
                <div
                    className={cn(
                        'h-full rounded-full transition-[width] duration-500 ease-out',
                        highlight ? 'bg-primary' : 'bg-muted-foreground/25',
                    )}
                    style={{ width: `${clamped}%` }}
                    aria-hidden="true"
                />
            </div>
        </div>
    )
}