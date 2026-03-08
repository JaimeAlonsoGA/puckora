import NextLink from 'next/link'
import { cn } from '@puckora/utils'

type TextLinkVariant = 'brand' | 'primary' | 'secondary' | 'muted'
type TextLinkSize = 'inherit' | 'xs' | 'sm' | 'base'

type TextLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    variant?: TextLinkVariant
    size?: TextLinkSize
    underline?: 'always' | 'hover' | 'never'
    external?: boolean
}

const VARIANT_MAP: Record<TextLinkVariant, string> = {
    brand: 'text-[color:var(--text-brand)]',
    primary: 'text-[color:var(--text-primary)]',
    secondary: 'text-[color:var(--text-secondary)]',
    muted: 'text-[color:var(--text-muted)]',
}

const SIZE_MAP: Record<TextLinkSize, string> = {
    inherit: '',
    xs: 'text-[length:var(--text-xs)]',
    sm: 'text-[length:var(--text-sm)]',
    base: 'text-[length:var(--text-base)]',
}

const UNDERLINE_MAP: Record<NonNullable<TextLinkProps['underline']>, string> = {
    always: 'underline',
    hover: 'hover:underline',
    never: 'no-underline',
}

export function TextLink({
    href,
    variant = 'brand',
    size = 'inherit',
    underline = 'hover',
    external = false,
    className,
    children,
    ...props
}: TextLinkProps) {
    const classes = cn(
        'transition-opacity duration-[var(--transition-fast)]',
        'hover:opacity-80 focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[color:var(--border-focus)] focus-visible:ring-offset-1',
        VARIANT_MAP[variant],
        SIZE_MAP[size],
        UNDERLINE_MAP[underline],
        className,
    )

    if (external) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={classes}
                {...props}
            >
                {children}
            </a>
        )
    }

    return (
        <NextLink href={href as any} className={classes} {...(props as any)}>
            {children}
        </NextLink>
    )
}
