import { cn } from '@puckora/utils'

type SurfaceVariant = 'base' | 'card' | 'secondary'
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
    base: 'bg-[color:var(--surface-base)]',
    card: 'bg-[color:var(--surface-card)]',
    secondary: 'bg-[color:var(--surface-secondary)]',
}

const PADDING_MAP: Record<SurfacePadding, string> = {
    none: '',
    sm: 'p-[var(--space-3)]',
    md: 'p-[var(--space-4)]',
    lg: 'p-[var(--space-6)]',
    xl: 'p-[var(--space-8)]',
}

const BORDER_MAP: Record<SurfaceBorder, string> = {
    none: '',
    default: 'border border-[color:var(--border-default)]',
    strong: 'border border-[color:var(--border-strong)]',
}

export function Surface({
    as: Tag = 'div',
    variant = 'card',
    padding = 'md',
    border = 'default',
    radius = false,
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
                radius && 'rounded-[var(--radius-md)]',
                className,
            )}
            {...props}
        >
            {children}
        </Tag>
    )
}
