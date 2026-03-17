import { cn } from '@puckora/utils'

type HeadingProps = {
    children: React.ReactNode
    className?: string
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export function Heading({ children, className, as: Tag = 'h2' }: HeadingProps) {
    return (
        <Tag
            className={cn(
                'font-sans font-semibold leading-tight tracking-tight',
                'text-3xl text-foreground',
                className,
            )}
        >
            {children}
        </Tag>
    )
}
