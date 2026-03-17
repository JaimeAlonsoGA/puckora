// ─────────────────────────────────────────────────────────────────────────────
// @puckora/research-graph — Utilities
// Pure functions only. No React, no Zustand, no browser APIs (except svgEl).
// ─────────────────────────────────────────────────────────────────────────────

import { LAYOUT } from '../constants'

export function truncate(str: string, maxChars: number): string {
    if (str.length <= maxChars) return str
    return str.slice(0, maxChars - 1) + '…'
}

export function generateId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

export function laneToX(lane: number): number {
    return LAYOUT.ORIGIN_X + lane * LAYOUT.LANE_W
}

export function rowToY(row: number): number {
    return row * LAYOUT.ROW_H
}

export const buildNodeLabel = {
    session: () => 'Started exploring',
    category: (name: string) => name,
    keyword: (query: string) => `Searched "${query}"`,
    product: (title: string) => truncate(title, 22),
    supplier: (name: string) => name,
    vector: (label: string) => label,
} as const satisfies Record<string, (...args: readonly string[]) => string>

const SVG_NS = 'http://www.w3.org/2000/svg' as const

export function svgEl<K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs?: Partial<Record<string, string | number>>,
    textContent?: string,
): SVGElementTagNameMap[K] {
    const el = document.createElementNS(SVG_NS, tag)
    if (attrs) {
        for (const [key, value] of Object.entries(attrs)) {
            if (value !== undefined) el.setAttribute(key, String(value))
        }
    }
    if (textContent !== undefined) el.textContent = textContent
    return el
}

export function filterSuggestions<T extends { readonly score: number }>(
    suggestions: readonly T[],
    minScore: number,
    maxCount: number,
): readonly T[] {
    return [...suggestions]
        .filter(s => s.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxCount)
}

export function buildLPath(
    x1: number, y1: number,
    x2: number, y2: number,
    startRadius = 0,
    endRadius = 0,
): string {
    const srcY = y1 + startRadius
    const dstY = y2 - endRadius
    const bendY = srcY + (dstY - srcY) * 0.4
    return `M${x1},${srcY} L${x1},${bendY} L${x2},${bendY} L${x2},${dstY}`
}

export function buildVerticalPath(
    x: number,
    y1: number,
    y2: number,
    startRadius = 0,
    endRadius = 0,
): string {
    return `M${x},${y1 + startRadius} L${x},${y2 - endRadius}`
}
