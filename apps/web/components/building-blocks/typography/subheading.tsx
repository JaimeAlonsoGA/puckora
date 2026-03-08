import { cn } from '@puckora/utils'

type SubheadingProps = {
    children: React.ReactNode
    className?: string
    as?: React.ElementType
}

export function Subheading({ children, className, as: Tag = 'h3' }: SubheadingProps) {
    return (
        <Tag
            className={cn(
                'font-sans font-medium leading-snug',
                'text-[length:var(--text-lg)] text-[color:var(--text-primary)]',
                className,
            )}
        >
            {children}
        </Tag>
    )
}
