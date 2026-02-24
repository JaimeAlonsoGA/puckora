import React from 'react'
import { cn } from '@repo/utils'

interface TypographyProps { children: React.ReactNode; className?: string }
export function Subheading({ children, className }: TypographyProps) {
    return <h3 className={cn('text-lg font-medium text-text-primary', className)}>{children}</h3>
}
