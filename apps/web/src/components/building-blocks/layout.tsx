/**
 * Layout building blocks — Silkflow v2 spacing primitives.
 *
 * Use these instead of raw <div style={{ display, gap, ... }}>
 * All gaps follow the 8px harmonic grid.
 *
 * Gap scale:
 *   xs  → 6px   (gap-1.5)
 *   sm  → 8px   (gap-2)
 *   md  → 12px  (gap-3)
 *   lg  → 16px  (gap-4)
 *   xl  → 20px  (gap-5)
 *   2xl → 24px  (gap-6)
 */
import React from 'react'
import { cn } from '@repo/utils'

export type Gap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
export type GridCols = 2 | 3 | 4 | 'swatches'
export type RowAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch'

const gapCls: Record<Gap, string> = {
    xs: 'gap-1.5',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-5',
    '2xl': 'gap-6',
}

const colsCls: Record<GridCols, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    swatches: 'grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))]',
}

const alignCls: Record<RowAlign, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    baseline: 'items-baseline',
    stretch: 'items-stretch',
}

interface LayoutProps {
    children: React.ReactNode
    className?: string
}

// ─── Stack ────────────────────────────────────────────────────────────────────
// Vertical flex column. Use for stacking unrelated groups.
interface StackProps extends LayoutProps {
    gap?: Gap
}

export function Stack({ gap = 'md', className, children }: StackProps) {
    return (
        <div className={cn('flex flex-col', gapCls[gap], className)}>
            {children}
        </div>
    )
}

// ─── Row ──────────────────────────────────────────────────────────────────────
// Horizontal flex row. Use for inline groups of components.
interface RowProps extends LayoutProps {
    gap?: Gap
    wrap?: boolean
    align?: RowAlign
}

export function Row({ gap = 'md', wrap = false, align = 'center', className, children }: RowProps) {
    return (
        <div className={cn('flex', wrap && 'flex-wrap', alignCls[align], gapCls[gap], className)}>
            {children}
        </div>
    )
}

// ─── Grid ─────────────────────────────────────────────────────────────────────
// CSS grid with predefined responsive column presets.
interface GridProps extends LayoutProps {
    cols?: GridCols
    gap?: Gap
}

export function Grid({ cols = 3, gap = 'lg', className, children }: GridProps) {
    return (
        <div className={cn('grid', colsCls[cols], gapCls[gap], className)}>
            {children}
        </div>
    )
}
