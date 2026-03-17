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
    sm: 'my-2',
    md: 'my-4',
    lg: 'my-6',
    xl: 'my-8',
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
                    'w-px self-stretch bg-border',
                    className,
                )}
            />
        )
    }

    return (
        <hr
            aria-hidden="true"
            className={cn(
                'border-0 border-t border-border',
                SPACING_MAP[spacing],
                className,
            )}
        />
    )
}
