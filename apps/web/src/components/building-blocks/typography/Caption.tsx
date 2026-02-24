import React from 'react'
import { cn } from '@repo/utils'

interface TypographyProps { children: React.ReactNode; className?: string }
export function Caption({ children, className }: TypographyProps) {
    return <span className={cn('text-xs text-text-muted', className)}>{children}</span>
}
