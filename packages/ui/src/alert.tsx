import { cn } from '@puckora/utils'
import { Body } from './typography'

type AlertVariant = 'success' | 'warning' | 'error' | 'info'

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
    variant?: AlertVariant
    title?: string
}

const VARIANT_MAP: Record<AlertVariant, { container: string; text: string; title: string }> = {
    success: {
        container: 'bg-success-surface border border-success-fg',
        text: 'text-success-fg',
        title: 'text-success-fg',
    },
    warning: {
        container: 'bg-warning-surface border border-warning-fg',
        text: 'text-warning-fg',
        title: 'text-warning-fg',
    },
    error: {
        container: 'bg-error-surface border border-error-fg',
        text: 'text-error-fg',
        title: 'text-error-fg',
    },
    info: {
        container: 'bg-info-surface border border-info-fg',
        text: 'text-info-fg',
        title: 'text-info-fg',
    },
}

export function Alert({
    variant = 'info',
    title,
    className,
    children,
    ...props
}: AlertProps) {
    const styles = VARIANT_MAP[variant]

    return (
        <div
            role="alert"
            className={cn(
                'flex flex-col gap-1 px-4 py-3 rounded-md',
                styles.container,
                className,
            )}
            {...props}
        >
            {title && (
                <Body as="p" className={cn('font-semibold', styles.title)}>
                    {title}
                </Body>
            )}
            <Body as="p" className={styles.text}>
                {children}
            </Body>
        </div>
    )
}
