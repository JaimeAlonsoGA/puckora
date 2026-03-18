'use client'

// ─────────────────────────────────────────────────────────────────────────────
// @puckora/research-graph — ResearchGraph Component
// Thin wrapper: manages refs, calls renderGraph() on data changes.
// Zero layout logic — lives in lib/layout.ts.
// Zero rendering logic — lives in lib/renderer.ts.
// Empty state is intentionally omitted — handle this in the consuming wrapper.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef } from 'react'
import type { ResearchGraphProps, NavigateEvent, FollowSuggestionEvent, ResearchGraphSlice } from '../types'
import { computeLayout } from '../lib/layout'
import { renderGraph } from '../lib/renderer'

interface ResearchGraphComponentProps extends ResearchGraphProps {
    /** The Zustand slice — injected rather than imported to stay store-agnostic */
    readonly slice: ResearchGraphSlice
}

export function ResearchGraph({
    slice,
    onNavigate,
    onFollowSuggestion,
    height = '160px',
    className = '',
}: ResearchGraphComponentProps) {
    const svgRef = useRef<SVGSVGElement>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)

    const { researchSession, suggestions } = slice
    const layout = useMemo(
        () => (researchSession ? computeLayout(researchSession.nodes, suggestions) : null),
        [researchSession, suggestions],
    )

    useEffect(() => {
        const svg = svgRef.current
        const tooltip = tooltipRef.current

        if (!svg || !tooltip || !researchSession) return

        renderGraph({
            svg,
            tooltip,
            nodes: researchSession.nodes,
            currentId: researchSession.currentId,
            suggestions,
            onNavigate: (event: NavigateEvent) => {
                slice.setCurrentNode(event.nodeId)
                onNavigate?.(event)
            },
            onFollowSuggestion: (event: FollowSuggestionEvent) => {
                onFollowSuggestion?.(event)
            },
        })
    }, [researchSession, suggestions, onNavigate, onFollowSuggestion, slice])

    if (!researchSession) return null

    return (
        <div className={`relative overflow-auto ${className}`} style={{ height }}>
            <div
                className="relative min-h-full min-w-full"
                style={{
                    width: layout ? `${layout.viewWidth}px` : '100%',
                    height: layout ? `${layout.viewHeight}px` : '100%',
                }}
            >
                <svg
                    ref={svgRef}
                    className="block"
                    width={layout?.viewWidth ?? undefined}
                    height={layout?.viewHeight ?? undefined}
                    preserveAspectRatio="xMinYMin meet"
                    aria-label="Research trail graph"
                    role="img"
                />
            </div>
            <div
                ref={tooltipRef}
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    pointerEvents: 'none',
                    opacity: 0,
                    transition: 'opacity 0.12s',
                    background: 'var(--foreground)',
                    color: 'var(--background)',
                    fontSize: '10px',
                    padding: '4px 8px',
                    borderRadius: '5px',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    maxWidth: '180px',
                    lineHeight: '1.5',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
            />
        </div>
    )
}
