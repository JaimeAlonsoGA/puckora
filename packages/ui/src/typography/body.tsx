import { cn } from '@puckora/utils'

type BodyProps = {
    children: React.ReactNode
    className?: string
    size?: 'sm' | 'base' | 'lg'
    as?: React.ElementType
}

const sizeMap = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
} as const

export function Body({ children, className, size = 'base', as: Tag = 'p' }: BodyProps) {
    return (
        <Tag
            className={cn(
                'font-sans font-normal leading-normal',
                'text-foreground',
                sizeMap[size],
                className,
            )}
        >
            {children}
        </Tag>
    )
}
