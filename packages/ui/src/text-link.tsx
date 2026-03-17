'use client'

import { cn } from '@puckora/utils'
import { useLinkComponent } from './link-context'

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
    brand: 'text-primary',
    primary: 'text-foreground',
    secondary: 'text-muted-foreground',
    muted: 'text-muted-foreground',
}

const SIZE_MAP: Record<TextLinkSize, string> = {
    inherit: '',
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
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
    const LinkComponent = useLinkComponent()

    const classes = cn(
        'transition-opacity duration-150',
        'hover:opacity-80 focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-ring focus-visible:ring-offset-1',
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
        <LinkComponent href={href} className={classes} {...props}>
            {children}
        </LinkComponent>
    )
}
