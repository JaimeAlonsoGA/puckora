import { cn } from '@puckora/utils'
import { Subheading, Body } from './typography'

/**
 * CardHeader — title + optional description for Surface card sections.
 * Encapsulates: mb-5 flex flex-col gap-1 + Subheading + Body size="sm".
 *
 * Usage:
 *   <CardHeader title="Profile" description="Update your display name" />
 *   <CardHeader title="Marketplace" />
 */
type CardHeaderProps = {
    title: string
    description?: string
    className?: string
}

export function CardHeader({ title, description, className }: CardHeaderProps) {
    return (
        <div className={cn('mb-5 flex flex-col gap-1', className)}>
            <Subheading>{title}</Subheading>
            {description && <Body size="sm">{description}</Body>}
        </div>
    )
}
