import { cn } from '@puckora/utils'
import { Body } from './typography'

type AlertVariant = 'success' | 'warning' | 'error' | 'info'

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
    variant?: AlertVariant
    title?: string
}

const VARIANT_MAP: Record<AlertVariant, { container: string; text: string; title: string }> = {
    success: {
        container: 'bg-[color:var(--surface-success)] border border-[color:var(--success)]',
        text: 'text-[color:var(--text-success)]',
        title: 'text-[color:var(--text-success)]',
    },
    warning: {
        container: 'bg-[color:var(--surface-warning)] border border-[color:var(--warning)]',
        text: 'text-[color:var(--text-warning)]',
        title: 'text-[color:var(--text-warning)]',
    },
    error: {
        container: 'bg-[color:var(--surface-error)] border border-[color:var(--error)]',
        text: 'text-[color:var(--text-error)]',
        title: 'text-[color:var(--text-error)]',
    },
    info: {
        container: 'bg-[color:var(--surface-info)] border border-[color:var(--info)]',
        text: 'text-[color:var(--text-info)]',
        title: 'text-[color:var(--text-info)]',
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
                'flex flex-col gap-[var(--space-1)] px-[var(--space-4)] py-[var(--space-3)]',
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
