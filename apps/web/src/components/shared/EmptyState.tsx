import React from 'react'
import { cn } from '@repo/utils'
import { Body } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks/Button'

export interface EmptyStateProps {
    title: string
    description?: string
    icon?: React.ReactNode
    action?: { label: string; onClick: () => void }
    className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-16 gap-4', className)}>
            {icon && <div className="text-text-muted">{icon}</div>}
            <div className="text-center">
                <p className="text-sm font-medium text-text-secondary">{title}</p>
                {description && <Body className="mt-1 text-text-muted">{description}</Body>}
            </div>
            {action && (
                <Button variant="secondary" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    )
}
