/**
 * Silkflow Design Tokens v2 — "The Seal"
 *
 * Philosophy: Clean, structured, premium. White ground. Gold hierarchy.
 * Scarlet and Purple as tonal accents. Ultramarine exclusively for borders.
 * Zero border-radius. Harmonic 8px spacing grid.
 *
 * Rule: No hardcoded colors in component code.
 *       All colors via CSS custom properties (--sf-*).
 *
 * Exception: Recharts chart palette uses literal hex values because the library
 *            resolves fill/stroke before CSS custom properties are computed.
 *            See CHART_PALETTE — values mirror the --sf-* tokens exactly.
 *
 * Variable prefix: --sf- (Silkflow)
 */

// ─── CSS variable references ───────────────────────────────────────────────────
// TypeScript constants that reference the CSS custom properties defined in
// globals.css. Source of truth for actual values is always the CSS file.
export const VAR = {
    // Surfaces
    bg: 'var(--sf-bg)',
    surface: 'var(--sf-surface)',
    surfaceAlt: 'var(--sf-surface-alt)',

    // Borders — ultramarine only
    border: 'var(--sf-border)',
    borderStrong: 'var(--sf-border-strong)',

    // Brand — Gold (primary)
    gold: 'var(--sf-gold)',
    goldDark: 'var(--sf-gold-dark)',
    goldBg: 'var(--sf-gold-bg)',

    // Brand — Scarlet (secondary / danger)
    scarlet: 'var(--sf-scarlet)',
    scarletDark: 'var(--sf-scarlet-dark)',
    scarletBg: 'var(--sf-scarlet-bg)',

    // Brand — Purple (tertiary / premium)
    purple: 'var(--sf-purple)',
    purpleDark: 'var(--sf-purple-dark)',
    purpleBg: 'var(--sf-purple-bg)',

    // Text
    text: 'var(--sf-text)',
    textSub: 'var(--sf-text-sub)',
    textMuted: 'var(--sf-text-muted)',
    textInv: 'var(--sf-text-inv)',

    // Semantic
    success: 'var(--sf-success)',
    warning: 'var(--sf-warning)',
    error: 'var(--sf-error)',
    info: 'var(--sf-info)',
} as const

// ─── Spacing scale (8px harmonic grid) ────────────────────────────────────────
export const space = {
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '8': '32px',
    '10': '40px',
    '12': '48px',
    '16': '64px',
} as const

// ─── Typography ────────────────────────────────────────────────────────────────
export const type = {
    display: { size: '36px', weight: 800, tracking: '-0.04em' },
    h1: { size: '24px', weight: 700, tracking: '-0.03em' },
    h2: { size: '18px', weight: 600, tracking: '-0.02em' },
    h3: { size: '15px', weight: 600, tracking: '-0.01em' },
    body: { size: '14px', weight: 400, tracking: '0' },
    small: { size: '12px', weight: 400, tracking: '0' },
    caption: { size: '11px', weight: 600, tracking: '0.06em' },
    mono: { size: '14px', weight: 500, tracking: '-0.01em', family: "'JetBrains Mono', monospace" },
} as const

// ─── Chart palette ─────────────────────────────────────────────────────────────
// Recharts constraint: CSS variables are not supported as stroke/fill values.
// These hex values mirror the --sf-* tokens exactly. Update both if a token changes.
export const CHART_PALETTE = {
    gold: '#A67C00', // mirrors --sf-gold
    scarlet: '#C0152A', // mirrors --sf-scarlet
    purple: '#6B1D8A', // mirrors --sf-purple
    success: '#1A6B3C', // mirrors --sf-success
    info: '#1B3FA8', // mirrors --sf-info
    warning: '#92500A', // mirrors --sf-warning
} as const

export const CHART_SEQUENCE = [
    CHART_PALETTE.gold,
    CHART_PALETTE.scarlet,
    CHART_PALETTE.purple,
    CHART_PALETTE.success,
    CHART_PALETTE.info,
    CHART_PALETTE.warning,
] as const

// ─── Legacy shim ───────────────────────────────────────────────────────────────
/** @deprecated Use VAR from tokens instead */
export const tokens = {
    colors: {
        brand: {
            gold: '#A67C00',
            scarlet: '#C0152A',
            purple: '#6B1D8A',
        },
        semantic: {
            success: '#1A6B3C',
            warning: '#92500A',
            error: '#A31525',
            info: '#1B3FA8',
        },
        chart: CHART_SEQUENCE,
    },
    radius: { none: '0px', sm: '0px', md: '0px', lg: '0px' },
    fonts: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
} as const

// Gradients — CSS var based; use only for decorative elements
export const gradients = {
    goldRule: 'linear-gradient(90deg, var(--sf-gold) 0%, var(--sf-gold-dark) 100%)',
} as const
