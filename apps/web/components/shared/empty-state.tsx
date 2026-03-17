import { Body, Subheading } from '@puckora/ui'
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
                'flex flex-col items-center justify-center gap-4 py-16 text-center',
                className,
            )}
        >
            {icon && (
                <div className="text-faint">{icon}</div>
            )}
            <div className="flex flex-col gap-1">
                <Subheading>{title}</Subheading>
                {description && <Body size="sm">{description}</Body>}
            </div>
            {action}
        </div>
    )
}
