// ─────────────────────────────────────────────────────────────────────────────
// @puckora/research-graph — Constants
// ─────────────────────────────────────────────────────────────────────────────

import type { GraphNodeType } from '../types'

export const LAYOUT = {
    TOP_PAD: 18,
    ROW_H: 32,
    LANE_W: 14,
    ORIGIN_X: 10,
    VIEW_W: 194,
    BOTTOM_PAD: 24,
    LABEL_OFFSET_X: 11,
    MAX_LABEL_CHARS: 19,
} as const

export const DOT = {
    RADIUS: 4,
    CURRENT_RADIUS: 5.5,
    CURRENT_RING_RADIUS: 8,
    CURRENT_RING_OPACITY: 0.35,
    SUGGEST_RADIUS: 3.5,
    SUGGEST_DASHARRAY: '2 1.5',
    SUGGEST_OPACITY: 0.75,
    HIT_RADIUS: 10,
} as const

export const LINE = {
    VISITED_WIDTH: 1.5,
    SUGGEST_WIDTH: 1.2,
    SUGGEST_DASHARRAY: '3 2',
    SUGGEST_OPACITY: 0.7,
} as const

// Use CSS custom properties so the graph respects the token system and dark mode
export const TEXT = {
    FONT_SIZE: 10,
    FONT_FAMILY: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    COLOR_VISITED: 'var(--text-muted)',
    COLOR_CURRENT: 'var(--foreground)',
    COLOR_SUGGESTION: 'var(--text-muted)',
    WEIGHT_CURRENT: '500',
    WEIGHT_DEFAULT: '400',
} as const

export const NODE_COLOR = {
    session: '#1D9E75',
    category: '#534AB7',
    keyword: '#BA7517',
    product: '#185FA5',
    supplier: '#993C1D',
    vector: '#993556',
} as const satisfies Record<GraphNodeType, string>

export const SUGGESTION = {
    MIN_SCORE: 0.65,
    MAX_COUNT: 4,
} as const

export const SESSION = {
    STORAGE_KEY: 'puckora_research_session',
    ROOT_ID: 'root',
} as const

export const TOOLTIP = {
    OFFSET_X: 12,
    OFFSET_Y: -8,
    TRANSITION_MS: 120,
} as const
