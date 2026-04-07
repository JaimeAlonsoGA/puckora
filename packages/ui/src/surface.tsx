import { cn } from '@puckora/utils'

type SurfaceVariant = 'base' | 'card' | 'secondary' | 'important'
type SurfacePadding = 'none' | 'sm' | 'md' | 'lg' | 'xl'
type SurfaceBorder = 'none' | 'default' | 'strong'

type SurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
    as?: React.ElementType
    variant?: SurfaceVariant
    padding?: SurfacePadding
    border?: SurfaceBorder
    radius?: boolean
}

const VARIANT_MAP: Record<SurfaceVariant, string> = {
    base: 'bg-background rounded-none',
    card: 'bg-card rounded-xl',
    secondary: 'bg-muted rounded-none',
    important: 'bg-important text-important-fg rounded-xl',
}

const PADDING_MAP: Record<SurfacePadding, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
}

const BORDER_MAP: Record<SurfaceBorder, string> = {
    none: '',
    default: 'border border-border',
    strong: 'border border-border-strong',
}

export function Surface({
    as: Tag = 'div',
    variant = 'card',
    padding = 'md',
    border = 'default',
    radius = true,
    className,
    children,
    ...props
}: SurfaceProps) {
    return (
        <Tag
            className={cn(
                VARIANT_MAP[variant],
                PADDING_MAP[padding],
                BORDER_MAP[border],
                radius === false && 'rounded-none',
                className,
            )}
            {...props}
        >
            {children}
        </Tag>
    )
}
