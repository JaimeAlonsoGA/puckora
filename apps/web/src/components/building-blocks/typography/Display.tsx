import React from 'react'
import { cn } from '@repo/utils'

interface TypographyProps {
    children: React.ReactNode
    className?: string
}

export function Display({ children, className }: TypographyProps) {
    return (
        <h1 className={cn('text-5xl font-bold tracking-tight text-text-primary', className)}>
            {children}
        </h1>
    )
}
