// ─────────────────────────────────────────────────────────────────────────────
// @puckora/research-graph — SVG Renderer
// Pure imperative DOM mutations. No React. No state.
// ─────────────────────────────────────────────────────────────────────────────

import type { ResearchNode, SuggestedNode, NodeLayout, RenderGraphInput } from '../types'
import { NODE_COLOR, DOT, LINE, TEXT, TOOLTIP, LAYOUT } from '../constants'
import { computeLayout } from './layout'
import { svgEl, truncate, buildLPath, buildVerticalPath } from '../utils'

function showTooltip(
    tooltip: HTMLElement,
    svgWrapper: Element,
    clientX: number,
    clientY: number,
    titleLine: string,
    subLine?: string,
): void {
    const rect = svgWrapper.getBoundingClientRect()
    tooltip.innerHTML = subLine
        ? `<span style="font-weight:500;display:block">${titleLine}</span><span style="opacity:0.7">${subLine}</span>`
        : `<span style="font-weight:500">${titleLine}</span>`
    tooltip.style.left = `${clientX - rect.left + TOOLTIP.OFFSET_X}px`
    tooltip.style.top = `${clientY - rect.top + TOOLTIP.OFFSET_Y}px`
    tooltip.style.opacity = '1'
}

function hideTooltip(tooltip: HTMLElement): void {
    tooltip.style.opacity = '0'
}

function drawConnector(
    svg: SVGSVGElement,
    srcLayout: NodeLayout,
    dstLayout: NodeLayout,
    color: string,
    isSuggestion = false,
): void {
    const { cx: x1, y: y1 } = srcLayout
    const { cx: x2, y: y2 } = dstLayout
    const isSameLane = x1 === x2

    const pathD = isSameLane
        ? buildVerticalPath(x1, y1, y2, DOT.RADIUS + 1, DOT.RADIUS + 1)
        : buildLPath(x1, y1, x2, y2, DOT.RADIUS + 1, DOT.RADIUS)

    const attrs: Record<string, string | number> = {
        d: pathD,
        stroke: color,
        'stroke-width': isSuggestion ? LINE.SUGGEST_WIDTH : LINE.VISITED_WIDTH,
        fill: 'none',
        'stroke-linejoin': 'round',
    }
    if (isSuggestion) {
        attrs['stroke-dasharray'] = LINE.SUGGEST_DASHARRAY
        attrs['opacity'] = LINE.SUGGEST_OPACITY
    }
    svg.appendChild(svgEl('path', attrs))
}

function drawVisitedDot(svg: SVGSVGElement, layout: NodeLayout, color: string, isCurrent: boolean): void {
    if (isCurrent) {
        svg.appendChild(svgEl('circle', { cx: layout.cx, cy: layout.y, r: DOT.CURRENT_RING_RADIUS, fill: 'none', stroke: color, 'stroke-width': '1.2', opacity: DOT.CURRENT_RING_OPACITY }))
        svg.appendChild(svgEl('circle', { cx: layout.cx, cy: layout.y, r: DOT.CURRENT_RADIUS, fill: color }))
    } else {
        svg.appendChild(svgEl('circle', { cx: layout.cx, cy: layout.y, r: DOT.RADIUS, fill: color }))
    }
}

function drawSuggestedDot(svg: SVGSVGElement, layout: NodeLayout, color: string): void {
    svg.appendChild(svgEl('circle', { cx: layout.cx, cy: layout.y, r: DOT.SUGGEST_RADIUS, fill: 'none', stroke: color, 'stroke-width': '1.4', 'stroke-dasharray': DOT.SUGGEST_DASHARRAY, opacity: DOT.SUGGEST_OPACITY }))
    svg.appendChild(svgEl('text', { x: layout.cx, y: layout.y, 'font-size': '6', fill: color, 'text-anchor': 'middle', 'dominant-baseline': 'central', opacity: '0.9' }, '›'))
}

function drawLabel(svg: SVGSVGElement, layout: NodeLayout, label: string, isCurrent: boolean, isSuggestion: boolean): void {
    const fill = isSuggestion ? TEXT.COLOR_SUGGESTION : isCurrent ? TEXT.COLOR_CURRENT : TEXT.COLOR_VISITED
    const weight = isCurrent ? TEXT.WEIGHT_CURRENT : TEXT.WEIGHT_DEFAULT
    svg.appendChild(svgEl('text', {
        x: layout.cx + LAYOUT.LABEL_OFFSET_X, y: layout.y + 1,
        'font-size': TEXT.FONT_SIZE, fill, 'dominant-baseline': 'central',
        'font-family': TEXT.FONT_FAMILY, 'font-weight': weight,
    }, truncate(label, LAYOUT.MAX_LABEL_CHARS)))
}

function makeNodeGroup(
    svg: SVGSVGElement,
    layout: NodeLayout,
    tooltip: HTMLElement,
    titleLine: string,
    subLine: string,
    onClick: () => void,
): SVGGElement {
    const g = svgEl('g', { style: 'cursor:pointer' })
    g.appendChild(svgEl('circle', { cx: layout.cx, cy: layout.y, r: DOT.HIT_RADIUS, fill: 'transparent' }))

    const svgWrapper = svg.parentElement!
    g.addEventListener('mouseenter', (e: MouseEvent) => showTooltip(tooltip, svgWrapper, e.clientX, e.clientY, titleLine, subLine))
    g.addEventListener('mousemove', (e: MouseEvent) => showTooltip(tooltip, svgWrapper, e.clientX, e.clientY, titleLine, subLine))
    g.addEventListener('mouseleave', () => hideTooltip(tooltip))
    g.addEventListener('click', (e: MouseEvent) => { e.stopPropagation(); onClick() })

    return g
}

function formatRelativeTime(iso: string): string {
    const diffMins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} min ago`
    const h = Math.floor(diffMins / 60)
    return h === 1 ? '1 hour ago' : `${h} hours ago`
}

export function renderGraph({ svg, tooltip, nodes, currentId, suggestions, onNavigate, onFollowSuggestion }: RenderGraphInput): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    if (nodes.length === 0) return

    const layout = computeLayout(nodes, suggestions)
    svg.setAttribute('viewBox', `0 0 ${layout.viewWidth} ${layout.viewHeight}`)
    svg.setAttribute('preserveAspectRatio', 'xMidYMin meet')

    const visitedById = new Map(layout.visited.map(l => [l.nodeId, l]))
    const suggestById = new Map(layout.suggestions.map(l => [l.nodeId, l]))

    // 1. Connectors (behind dots)
    nodes.forEach(node => {
        if (!node.parentId) return
        const src = visitedById.get(node.parentId)
        const dst = visitedById.get(node.id)
        if (src && dst) drawConnector(svg, src, dst, NODE_COLOR[node.type], false)
    })
    suggestions.forEach(s => {
        const src = visitedById.get(s.parentId)
        const dst = suggestById.get(s.id)
        if (src && dst) drawConnector(svg, src, dst, NODE_COLOR[s.type], true)
    })

    // 2. Visited nodes
    nodes.forEach(node => {
        const nodeLayout = visitedById.get(node.id)
        if (!nodeLayout) return
        const color = NODE_COLOR[node.type]
        const isCurrent = node.id === currentId
        const g = makeNodeGroup(svg, nodeLayout, tooltip, node.label, formatRelativeTime(node.timestamp), () => onNavigate({ nodeId: node.id, node }))
        drawVisitedDot(g as unknown as SVGSVGElement, nodeLayout, color, isCurrent)
        drawLabel(g as unknown as SVGSVGElement, nodeLayout, node.label, isCurrent, false)
        svg.appendChild(g)
    })

    // 3. Suggestion nodes (on top)
    suggestions.forEach(s => {
        const nodeLayout = suggestById.get(s.id)
        if (!nodeLayout) return
        const color = NODE_COLOR[s.type]
        const g = makeNodeGroup(svg, nodeLayout, tooltip, s.label, `→ ${s.reason}`, () => onFollowSuggestion({ suggestion: s }))
        drawSuggestedDot(g as unknown as SVGSVGElement, nodeLayout, color)
        drawLabel(g as unknown as SVGSVGElement, nodeLayout, s.label, false, true)
        svg.appendChild(g)
    })
}
