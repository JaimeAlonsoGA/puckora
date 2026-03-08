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
                'text-[length:var(--text-sm)] text-[color:var(--text-primary)]',
                className,
            )}
        >
            {children}
        </label>
    )
}
