import { cn } from '@puckora/utils'

type MonoProps = {
    children: React.ReactNode
    className?: string
    as?: React.ElementType
}

export function Mono({ children, className, as: Tag = 'code' }: MonoProps) {
    return (
        <Tag
            className={cn(
                'font-mono font-normal leading-normal',
                'text-[length:var(--text-sm)] text-[color:var(--text-secondary)]',
                className,
            )}
        >
            {children}
        </Tag>
    )
}
