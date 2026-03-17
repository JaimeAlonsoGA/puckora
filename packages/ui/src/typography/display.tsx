import { cn } from '@puckora/utils'

type TypographyProps = {
    children: React.ReactNode
    className?: string
    as?: React.ElementType
}

export function Display({ children, className, as: Tag = 'h1' }: TypographyProps) {
    return (
        <Tag
            className={cn(
                'font-sans font-bold leading-none tracking-tight',
                'text-5xl text-foreground',
                className,
            )}
        >
            {children}
        </Tag>
    )
}
