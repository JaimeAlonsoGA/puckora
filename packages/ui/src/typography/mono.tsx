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
                'text-sm text-muted-foreground',
                className,
            )}
        >
            {children}
        </Tag>
    )
}
