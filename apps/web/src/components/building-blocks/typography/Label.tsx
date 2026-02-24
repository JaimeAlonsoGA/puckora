import React from 'react'
import { cn } from '@repo/utils'

interface TypographyProps { children: React.ReactNode; className?: string }
export function Label({ children, className }: TypographyProps) {
    return (
        <span className={cn('text-xs font-medium text-text-secondary uppercase tracking-wide', className)}>
            {children}
        </span>
    )
}
