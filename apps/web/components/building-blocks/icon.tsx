import { cn } from '@puckora/utils'

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type IconProps = {
    icon: React.ReactNode
    size?: IconSize
    className?: string
    label?: string
}

const sizeMap: Record<IconSize, string> = {
    xs: '[&>svg]:h-3.5 [&>svg]:w-3.5',
    sm: '[&>svg]:h-4 [&>svg]:w-4',
    md: '[&>svg]:h-5 [&>svg]:w-5',
    lg: '[&>svg]:h-6 [&>svg]:w-6',
    xl: '[&>svg]:h-8 [&>svg]:w-8',
}

export function Icon({ icon, size = 'md', className, label }: IconProps) {
    return (
        <span
            role={label ? 'img' : 'presentation'}
            aria-label={label}
            className={cn('inline-flex shrink-0 items-center justify-center', sizeMap[size], className)}
        >
            {icon}
        </span>
    )
}
