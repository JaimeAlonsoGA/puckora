'use client'

import { cn } from '@puckora/utils'
import { useLinkComponent } from './link-context'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    ref?: React.Ref<HTMLButtonElement>
    variant?: ButtonVariant
    size?: ButtonSize
    icon?: React.ReactNode
    iconRight?: React.ReactNode
    loading?: boolean
    fullWidth?: boolean
    /**
     * When provided the button renders as a link for navigation.
     * Use this instead of wrapping <Button> inside <Link>.
     * The actual link component is injected via <LinkProvider>.
     */
    href?: string
    /** Opens the link in a new tab with rel="noopener noreferrer". Only applies when href is set. */
    external?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: [
        'bg-primary text-primary-foreground',
        'hover:bg-primary/90 active:bg-primary/80',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    ].join(' '),
    secondary: [
        'bg-card text-foreground border border-border',
        'hover:bg-accent active:bg-accent',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    ].join(' '),
    ghost: [
        'bg-transparent text-muted-foreground',
        'hover:bg-accent hover:text-accent-foreground active:bg-accent',
        'focus-visible:ring-2 focus-visible:ring-ring',
    ].join(' '),
    danger: [
        'bg-destructive text-destructive-foreground',
        'hover:bg-destructive/90 active:bg-destructive/80',
        'focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    ].join(' '),
    outline: [
        'bg-transparent text-primary border border-primary',
        'hover:bg-primary/10 active:bg-primary/10',
        'focus-visible:ring-2 focus-visible:ring-ring',
    ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-9 px-3.5 text-sm gap-2 rounded-md',
    md: 'h-11 px-5 text-base gap-2 rounded-md',
    lg: 'h-13 px-7 text-base gap-2.5 rounded-lg',
}

export function Button({
    ref,
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    loading = false,
    fullWidth = false,
    disabled,
    className,
    children,
    href,
    external,
    ...props
}: ButtonProps) {
    const LinkComponent = useLinkComponent()

    const classes = cn(
        'cursor-pointer inline-flex items-center justify-center font-medium',
        'transition-all',
        'duration-150',
        'select-none whitespace-nowrap',
        'disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
    )

    const content = (
        <>
            {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
                icon
            )}
            {children}
            {iconRight}
        </>
    )

    if (href) {
        return (
            <LinkComponent
                href={href}
                className={classes}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
                {content}
            </LinkComponent>
        )
    }

    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={classes}
            {...props}
        >
            {content}
        </button>
    )
}
