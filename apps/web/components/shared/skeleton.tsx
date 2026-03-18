import { cn } from '@puckora/utils'

interface SkeletonBlockProps {
    className?: string
}

export function SkeletonBlock({ className }: SkeletonBlockProps) {
    return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-surface-card', className)} />
}

interface SkeletonCircleProps {
    className?: string
}

export function SkeletonCircle({ className }: SkeletonCircleProps) {
    return <SkeletonBlock className={cn('rounded-full', className)} />
}

interface SkeletonPillProps {
    className?: string
}

export function SkeletonPill({ className }: SkeletonPillProps) {
    return <SkeletonBlock className={cn('h-8 rounded-full', className)} />
}

interface SkeletonTextProps {
    lines?: number
    className?: string
    lineClassName?: string
}

export function SkeletonText({
    lines = 3,
    className,
    lineClassName,
}: SkeletonTextProps) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, index) => (
                <SkeletonBlock
                    key={index}
                    className={cn(
                        'h-3.5',
                        index === lines - 1 ? 'w-[72%]' : 'w-full',
                        lineClassName,
                    )}
                />
            ))}
        </div>
    )
}

interface SkeletonPanelProps {
    className?: string
    children?: React.ReactNode
}

export function SkeletonPanel({ className, children }: SkeletonPanelProps) {
    return <div className={cn('rounded-lg border border-border-subtle bg-card', className)}>{children}</div>
}

interface SkeletonPageHeaderProps {
    eyebrowClassName?: string
    titleClassName?: string
    descriptionClassName?: string
}

export function SkeletonPageHeader({
    eyebrowClassName,
    titleClassName,
    descriptionClassName,
}: SkeletonPageHeaderProps) {
    return (
        <div className="flex flex-col gap-2">
            <SkeletonBlock className={cn('h-3.5 w-40', eyebrowClassName)} />
            <SkeletonBlock className={cn('h-8 w-72 max-w-full', titleClassName)} />
            <SkeletonBlock className={cn('h-5 w-80 max-w-full', descriptionClassName)} />
        </div>
    )
}