import React from 'react'
import { cn } from '@repo/utils'

interface TypographyProps { children: React.ReactNode; className?: string; style?: React.CSSProperties }
export function Body({ children, className, style }: TypographyProps) {
    return <p className={cn('text-sm text-text-secondary leading-relaxed', className)} style={style}>{children}</p>
}

