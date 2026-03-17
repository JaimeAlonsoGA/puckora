// ─────────────────────────────────────────────────────────────────────────────
// @puckora/research-graph — Layout Engine
// Pure functions. No DOM, no React, no side effects.
// ─────────────────────────────────────────────────────────────────────────────

import type { ResearchNode, SuggestedNode, GraphLayout, NodeLayout } from '../types'
import { LAYOUT, SUGGESTION, DOT } from '../constants'
import { laneToX, rowToY, filterSuggestions } from '../utils'

function assignLanes(nodes: readonly ResearchNode[]): ReadonlyMap<string, number> {
    const laneOf = new Map<string, number>()
    const queue: Array<{ id: string; lane: number }> = []
    const visited = new Set<string>()
    let nextLane = 1

    const first = nodes[0]
    if (!first) return laneOf
    queue.push({ id: first.id, lane: 0 })

    while (queue.length > 0) {
        const item = queue.shift()
        if (!item || visited.has(item.id)) continue
        visited.add(item.id)
        laneOf.set(item.id, item.lane)

        const children = nodes.filter(n => n.parentId === item.id)
        children.forEach((child, i) => {
            const childLane = i === 0 ? item.lane : nextLane++
            queue.push({ id: child.id, lane: childLane })
        })
    }

    return laneOf
}

function assignYPositions(nodes: readonly ResearchNode[]): ReadonlyMap<string, number> {
    const yOf = new Map<string, number>()
    const processed = new Set<string>()
    let cursor = 0

    function process(node: ResearchNode): void {
        if (processed.has(node.id)) return
        if (node.parentId !== null) {
            const parent = nodes.find(n => n.id === node.parentId)
            if (parent && !processed.has(parent.id)) process(parent)
        }
        processed.add(node.id)
        yOf.set(node.id, rowToY(cursor))
        cursor++
    }

    nodes.forEach(n => process(n))
    return yOf
}

function layoutSuggestions(
    suggestions: readonly SuggestedNode[],
    visitedLanes: ReadonlyMap<string, number>,
    visitedY: ReadonlyMap<string, number>,
    maxVisitedLane: number,
): ReadonlyMap<string, { lane: number; y: number }> {
    const result = new Map<string, { lane: number; y: number }>()
    let nextLane = maxVisitedLane + 1

    suggestions.forEach((s) => {
        const parentY = visitedY.get(s.parentId) ?? 0
        const siblingsAbove = suggestions.filter(
            ss => ss.parentId === s.parentId &&
                suggestions.indexOf(ss) < suggestions.indexOf(s)
        )
        result.set(s.id, {
            lane: nextLane++,
            y: parentY + LAYOUT.ROW_H + siblingsAbove.length * LAYOUT.ROW_H,
        })
    })

    return result
}

export function computeLayout(
    nodes: readonly ResearchNode[],
    rawSuggestions: readonly SuggestedNode[],
): GraphLayout {
    if (nodes.length === 0) {
        return { visited: [], suggestions: [], viewHeight: LAYOUT.ROW_H, viewWidth: LAYOUT.VIEW_W, totalLanes: 1 }
    }

    const suggestions = filterSuggestions(rawSuggestions, SUGGESTION.MIN_SCORE, SUGGESTION.MAX_COUNT)
    const visitedLanes = assignLanes(nodes)
    const visitedY = assignYPositions(nodes)
    const maxVisitedLane = Math.max(0, ...Array.from(visitedLanes.values()))
    const suggestPositions = layoutSuggestions(suggestions, visitedLanes, visitedY, maxVisitedLane)

    const visitedLayouts: NodeLayout[] = nodes.map(node => ({
        nodeId: node.id,
        lane: visitedLanes.get(node.id) ?? 0,
        y: visitedY.get(node.id) ?? 0,
        cx: laneToX(visitedLanes.get(node.id) ?? 0),
    }))

    const suggestionLayouts: NodeLayout[] = suggestions.map(s => {
        const pos = suggestPositions.get(s.id) ?? { lane: 0, y: 0 }
        return { nodeId: s.id, lane: pos.lane, y: pos.y, cx: laneToX(pos.lane) }
    })

    const allYValues = [...visitedLayouts.map(l => l.y), ...suggestionLayouts.map(l => l.y)]
    const maxY = Math.max(0, ...allYValues)
    const allLanes = [...visitedLayouts.map(l => l.lane), ...suggestionLayouts.map(l => l.lane)]
    const totalLanes = Math.max(1, ...allLanes) + 1
    const viewWidth = Math.max(LAYOUT.VIEW_W, laneToX(totalLanes - 1) + 110)

    return {
        visited: visitedLayouts,
        suggestions: suggestionLayouts,
        viewHeight: maxY + LAYOUT.ROW_H + LAYOUT.BOTTOM_PAD,
        viewWidth,
        totalLanes,
    }
}

export function getLayout(layouts: readonly NodeLayout[], nodeId: string): NodeLayout {
    const found = layouts.find(l => l.nodeId === nodeId)
    if (!found) throw new Error(`[ResearchGraph] Layout not found for node: ${nodeId}`)
    return found
}
