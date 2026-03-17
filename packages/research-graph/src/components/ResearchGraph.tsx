'use client'

// ─────────────────────────────────────────────────────────────────────────────
// @puckora/research-graph — ResearchGraph Component
// Thin wrapper: manages refs, calls renderGraph() on data changes.
// Zero layout logic — lives in lib/layout.ts.
// Zero rendering logic — lives in lib/renderer.ts.
// Empty state is intentionally omitted — handle this in the consuming wrapper.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import type { ResearchGraphProps, NavigateEvent, FollowSuggestionEvent, ResearchGraphSlice } from '../types'
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
        <div className={`relative overflow-hidden ${className}`} style={{ height }}>
            <svg
                ref={svgRef}
                className="w-full h-full"
                preserveAspectRatio="xMidYMin meet"
                aria-label="Research trail graph"
                role="img"
            />
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
