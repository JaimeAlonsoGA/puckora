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
                'text-[length:var(--text-2xl)] text-[color:var(--text-primary)]',
                className,
            )}
        >
            {children}
        </Tag>
    )
}
