import { cn } from '@puckora/utils'

type LabelProps = {
    children: React.ReactNode
    className?: string
    htmlFor?: string
}

export function Label({ children, className, htmlFor }: LabelProps) {
    return (
        <label
            htmlFor={htmlFor}
            className={cn(
                'font-sans font-medium leading-none',
                'text-sm text-foreground',
                className,
            )}
        >
            {children}
        </label>
    )
}
