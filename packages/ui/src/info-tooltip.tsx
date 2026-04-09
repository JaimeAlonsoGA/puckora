'use client'

import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@puckora/utils'
import { Caption } from './typography'

// ---------------------------------------------------------------------------
// InfoTooltip
//
// A small circular "?" trigger that reveals a dark popover on hover or
// keyboard focus. Uses a React portal (position: fixed) so it escapes any
// ancestor overflow:hidden/overflow:auto clipping — safe across all layouts.
//
// Usage:
//   <InfoTooltip
//     title="Median, not average"
//     description={<>Computed from <code>price</code> across 50 sampled products.</>}
//   />
//
// Compose inline with a label row:
//   <div className="flex items-center gap-1.5">
//     <Caption>Median price</Caption>
//     <InfoTooltip title="Why median?" description="Resistant to outliers." />
//   </div>
// ---------------------------------------------------------------------------

const TOOLTIP_PX = 208 // w-52
const GAP_PX = 8

type InfoTooltipProps = {
    title: string
    description: React.ReactNode
    /** Tooltip popover position relative to the trigger. */
    position?: 'right' | 'left'
    className?: string
}

export function InfoTooltip({
    title,
    description,
    position = 'right',
    className,
}: InfoTooltipProps) {
    const triggerRef = useRef<HTMLSpanElement>(null)
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

    const show = useCallback(() => {
        const rect = triggerRef.current?.getBoundingClientRect()
        if (!rect) return
        const top = rect.top + rect.height / 2 - 10 // align near top of trigger
        const left =
            position === 'right'
                ? rect.right + GAP_PX
                : rect.left - GAP_PX - TOOLTIP_PX
        setCoords({ top, left })
    }, [position])

    const hide = useCallback(() => setCoords(null), [])

    return (
        <>
            <span
                ref={triggerRef}
                className={cn('inline-flex items-center', className)}
                tabIndex={0}
                aria-label={title}
                onMouseEnter={show}
                onFocus={show}
                onMouseLeave={hide}
                onBlur={hide}
            >
                {/* Trigger */}
                <span
                    aria-hidden="true"
                    className={cn(
                        'inline-flex size-3.5 items-center justify-center rounded-full',
                        'border border-border text-faint cursor-help select-none',
                        'text-[8px] font-semibold leading-none',
                    )}
                >
                    ?
                </span>
            </span>

            {/* Portal — renders into document.body, escaping all overflow containers */}
            {coords &&
                createPortal(
                    <span
                        role="tooltip"
                        style={{
                            position: 'fixed',
                            top: coords.top,
                            left: coords.left,
                            zIndex: 9999,
                            width: TOOLTIP_PX,
                            pointerEvents: 'none',
                        }}
                        className="rounded-lg bg-important px-3 py-2 shadow-md shadow-black/20"
                    >
                        <Caption
                            as="p"
                            className="font-medium text-important-fg mb-1 leading-snug"
                        >
                            {title}
                        </Caption>
                        <Caption
                            as="p"
                            className="text-important-fg-2 leading-relaxed"
                        >
                            {description}
                        </Caption>
                    </span>,
                    document.body,
                )}
        </>
    )
}

