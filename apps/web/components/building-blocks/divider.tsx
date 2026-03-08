import { cn } from '@puckora/utils'

type DividerSpacing = 'none' | 'sm' | 'md' | 'lg' | 'xl'
type DividerOrientation = 'horizontal' | 'vertical'

type DividerProps = {
    spacing?: DividerSpacing
    orientation?: DividerOrientation
    className?: string
}

const SPACING_MAP: Record<DividerSpacing, string> = {
    none: 'my-0',
    sm: 'my-[var(--space-2)]',
    md: 'my-[var(--space-4)]',
    lg: 'my-[var(--space-6)]',
    xl: 'my-[var(--space-8)]',
}

export function Divider({
    spacing = 'md',
    orientation = 'horizontal',
    className,
}: DividerProps) {
    if (orientation === 'vertical') {
        return (
            <div
                aria-hidden="true"
                className={cn(
                    'w-px self-stretch bg-[color:var(--border-default)]',
                    className,
                )}
            />
        )
    }

    return (
        <hr
            aria-hidden="true"
            className={cn(
                'border-0 border-t border-[color:var(--border-default)]',
                SPACING_MAP[spacing],
                className,
            )}
        />
    )
}
