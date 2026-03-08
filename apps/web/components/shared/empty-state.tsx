import { Body } from '@/components/building-blocks/typography'
import { Subheading } from '@/components/building-blocks/typography'
import { cn } from '@puckora/utils'

type EmptyStateProps = {
    title: string
    description?: string
    icon?: React.ReactNode
    action?: React.ReactNode
    className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center gap-[var(--space-4)] py-[var(--space-16)] text-center',
                className,
            )}
        >
            {icon && (
                <div className="text-[color:var(--text-tertiary)]">{icon}</div>
            )}
            <div className="flex flex-col gap-[var(--space-1)]">
                <Subheading>{title}</Subheading>
                {description && <Body size="sm">{description}</Body>}
            </div>
            {action}
        </div>
    )
}
