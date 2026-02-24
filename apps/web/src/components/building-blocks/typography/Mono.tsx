import React from 'react'
import { cn } from '@repo/utils'

interface TypographyProps { children: React.ReactNode; className?: string }
export function Mono({ children, className }: TypographyProps) {
    return <span className={cn('font-mono text-sm text-text-primary', className)}>{children}</span>
}
