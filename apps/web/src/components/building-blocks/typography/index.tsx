/**
 * Typography building blocks — Silkflow v2 type scale.
 *
 * All components use semantic Tailwind classes that map to --sf-* CSS tokens.
 * Never use raw <h1>-<h6> or <p> for user-facing text in the app; use these instead.
 *
 * Scale reference:
 *   Display   — 36px/800  — hero headings, landing
 *   Heading   — 24px/700  — page titles
 *   Subheading— 15px/600  — section titles, card headers
 *   Body      — 14px/400  — content, descriptions
 *   Small     — 12px/400  — secondary info, hints
 *   Caption   — 11px/600  — UPPERCASE labels, stat names
 *   Label     — 11px/600  — form labels, field names
 *   Mono      — 14px/500  — numeric values, code, metrics
 */
import React from 'react'
import { cn } from '@repo/utils'

interface TypographyProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Display({ children, className, style }: TypographyProps) {
  return (
    <h1 className={cn('text-[36px] font-extrabold tracking-[-0.04em] leading-none text-text-primary', className)} style={style}>
      {children}
    </h1>
  )
}

export function Heading({ children, className, style }: TypographyProps) {
  return (
    <h2 className={cn('text-2xl font-bold tracking-[-0.03em] leading-tight text-text-primary', className)} style={style}>
      {children}
    </h2>
  )
}

export function Subheading({ children, className, style }: TypographyProps) {
  return (
    <h3 className={cn('text-[15px] font-semibold tracking-[-0.01em] text-text-primary', className)} style={style}>
      {children}
    </h3>
  )
}

export function Body({ children, className, style }: TypographyProps) {
  return (
    <p className={cn('text-sm text-text-secondary leading-relaxed', className)} style={style}>
      {children}
    </p>
  )
}

export function Small({ children, className, style }: TypographyProps) {
  return (
    <span className={cn('text-xs text-text-secondary leading-normal', className)} style={style}>
      {children}
    </span>
  )
}

export function Caption({ children, className, style }: TypographyProps) {
  return (
    <span className={cn('text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted', className)} style={style}>
      {children}
    </span>
  )
}

export function Label({ children, className, style }: TypographyProps) {
  return (
    <span className={cn('text-[11px] font-semibold uppercase tracking-[0.05em] text-text-muted', className)} style={style}>
      {children}
    </span>
  )
}

export function Mono({ children, className, style }: TypographyProps) {
  return (
    <span className={cn('font-mono text-sm font-medium tracking-[-0.01em] text-text-primary', className)} style={style}>
      {children}
    </span>
  )
}
