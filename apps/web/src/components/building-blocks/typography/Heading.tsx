import React from 'react'
import { cn } from '@repo/utils'

interface TypographyProps {
    children: React.ReactNode
    className?: string
    style?: React.CSSProperties
}

export function Heading({ children, className, style }: TypographyProps) {
    return (
        <h2 className={cn('text-2xl font-semibold text-text-primary', className)} style={style}>
            {children}
        </h2>
    )
}

