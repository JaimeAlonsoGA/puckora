import { useId } from 'react'
import type { SVGProps } from 'react'
import { cn } from '@puckora/utils'

export interface ProductBoxProps extends SVGProps<SVGSVGElement> {
    /** Package dimension along the viewer-right axis (cm, or any consistent unit) */
    width: number
    /** Package dimension along the vertical axis */
    height: number
    /** Package dimension going back into depth */
    depth: number
    /**
     * Rendered canvas size in px. The box scales proportionally to fill this
     * square.
     * @default 64
     */
    size?: number
    /**
     * When true, projects the raw cm ratios directly. The default (false)
     * applies perceptual compression so extreme aspect ratios (a 1×30×1 bottle,
     * a 30×1×20 tray, a 5×5×5 cube) all remain clearly legible at icon sizes.
     */
    rawProportions?: boolean
}

// ── Projection constants ──────────────────────────────────────────────────────
//
// Standard isometric (axonometric) projection. Y is up in 3-D; the viewer is
// positioned at (+X, +Y, −Z) — i.e. looking at the front-top-right of the box.
// Three faces are visible: TOP (y = h), FRONT (z = 0), RIGHT (x = w).
//
//   screen_x  =  (x − z) · cos 30°
//   screen_y  =  −y  +  (x + z) · sin 30°
//
// This maps the raw 3-D box into a hexagonal silhouette with six outer vertices
// and one interior peak (c7) where the three visible-face boundaries converge.
// The two "body-diagonal" corners (0,0,0) and (w,h,d) are algebraically antipodal
// in this projection — they both collapse toward the interior and are never part
// of the outer convex hull.

const COS30 = Math.sqrt(3) / 2   // ≈ 0.866
const SIN30 = 0.5

// ── Perceptual compression ────────────────────────────────────────────────────
//
// Amazon product dimensions span 0.5 cm (USB key) to 200 cm (wardrobe).
// A raw 1:200 ratio renders as invisible slivers at 52 px.
//
// Power-curve compression (exp 0.45) maps the ratio space onto a legible range:
//   1:200  →  1:8.3   (12% of dominant — a clear sliver that reads as "thin")
//   1:10   →  1:3.6   (28% of dominant — clearly narrower)
//   1:3    →  1:2.1   (47% — noticeably different)
//   1:1    →  1:1     (cube unchanged)
//
// Result is normalized: dominant axis = 1.
function toPerceptual(w: number, h: number, d: number): [number, number, number] {
    const EXP = 0.45
    const pw = Math.pow(w, EXP)
    const ph = Math.pow(h, EXP)
    const pd = Math.pow(d, EXP)
    const m = Math.max(pw, ph, pd)
    return [pw / m, ph / m, pd / m]
}

const f2 = (n: number) => parseFloat(n.toFixed(2))
const pt = ([x, y]: [number, number]) => `${f2(x)},${f2(y)}`
const joinPts = (pts: Array<[number, number]>) => pts.map(pt).join(' ')

/**
 * `ProductBox` — proportional isometric SVG cuboid matching the Lucide icon
 * design language (lucide-box / lucide-cuboid).
 *
 * Visual language:
 * - Same oblique dimetric projection used in both Lucide box icons
 * - Outer boundary drawn as a smooth closed `<path>` with rounded corners
 *   (identical to how Lucide draws the box shell)
 * - Interior crease lines (equator + vertical spine) drawn as lighter paths,
 *   mirroring the Lucide `m3.3 7 8.7 5 8.7-5` / `M12 22V12` detail lines
 * - Three visible face tints (graduated opacity) give depth with no extra color
 * - All fills use `currentColor` → works in dark and light mode automatically
 *
 * SSR-safe: pure arithmetic, no browser APIs.
 */
export function ProductBox({
    width: W,
    height: H,
    depth: D,
    size = 64,
    rawProportions = false,
    className,
    ...props
}: ProductBoxProps) {
    // ── Input sanitization ────────────────────────────────────────────────────
    const safeW = Number.isFinite(W) && W > 0 ? W : 1
    const safeH = Number.isFinite(H) && H > 0 ? H : 1
    const safeD = Number.isFinite(D) && D > 0 ? D : 1

    const [w, h, d] = rawProportions
        ? (() => { const m = Math.max(safeW, safeH, safeD); return [safeW / m, safeH / m, safeD / m] as [number, number, number] })()
        : toPerceptual(safeW, safeH, safeD)

    // ── Bounding box in raw projection space ─────────────────────────────────
    //
    //   Raw projection: sx = (x−z)·COS30,  sy = −y + (x+z)·SIN30
    //
    //   Extremes over the six outer-hull vertices:
    //     min sx  = c6.sx = −d·COS30
    //     max sx  = c3.sx = c1.sx = w·COS30   → spanX = (w+d)·COS30
    //     min sy  = c2.sy = −h                → topmost
    //     max sy  = c5.sy = (w+d)·SIN30       → spanY = h + (w+d)·SIN30

    const spanX = (w + d) * COS30
    const spanY = h + (w + d) * SIN30

    // Fit the shape inside the canvas with padding on all sides
    const PAD = size * 0.06
    const avail = size - 2 * PAD
    const S = avail / Math.max(spanX, spanY)

    // Translate so raw-projection origin (0,0) lands correctly, then center.
    // Raw min corner = (−d·COS30, −h) → after shift by (d·COS30, h) → (0, 0)
    const ox = PAD + (avail - spanX * S) / 2
    const oy = PAD + (avail - spanY * S) / 2

    // Project a 3-D point into canvas pixel coordinates
    const P = (x: number, y: number, z: number): [number, number] => [
        ((x - z) * COS30 + d * COS30) * S + ox,
        (-y + (x + z) * SIN30 + h) * S + oy,
    ]

    // ── 7 vertices ───────────────────────────────────────────────────────────
    //
    //  Isometric view from upper-front-right. Three visible faces:
    //  TOP (y=h), FRONT (z=0), RIGHT (x=w).
    //
    //  Six OUTER hull vertices (clockwise from topmost screen point):
    //
    //        c6 ────── c7(inner) ──── c3
    //       /  (top face)         /
    //     c2                   c7(inner)
    //      |  (front face)      | (right face)
    //      |                    |
    //     c4 ────── c5 ──────c1
    //
    //  c1 = (w,0,0)  front-bottom-right   hull — rightmost bottom
    //  c2 = (0,h,0)  front-top-left       hull — topmost screen point
    //  c3 = (w,h,0)  front-top-right      hull — rightmost screen point
    //  c4 = (0,0,d)  back-bottom-left     hull — leftmost bottom
    //  c5 = (w,0,d)  back-bottom-right    hull — bottommost screen point
    //  c6 = (0,h,d)  back-top-left        hull — leftmost screen point
    //
    //  c7 = (w,h,d)  back-top-right       INNER PEAK (inside hull)
    //                The junction of all three visible faces. Its 3 edges
    //                form the visible face-boundary 'Y' inside the silhouette.
    //
    //  (0,0,0) and (w,h,d) are the two ends of the body diagonal; they project
    //  to interior points and are never part of the silhouette.

    const c1 = P(w, 0, 0)   // front-bottom-right  (hull)
    const c2 = P(0, h, 0)   // front-top-left      (hull, topmost)
    const c3 = P(w, h, 0)   // front-top-right     (hull, rightmost)
    const c4 = P(0, 0, d)   // back-bottom-left    (hull)
    const c5 = P(w, 0, d)   // back-bottom-right   (hull, bottommost)
    const c6 = P(0, h, d)   // back-top-left       (hull, leftmost)
    const c7 = P(w, h, d)   // back-top-right      (inner peak)

    const clipId = useId()

    // ── Stroke + corner-radius parameters ────────────────────────────────────
    //
    // The Lucide icons use `stroke-width: 2` on a 24-unit canvas, which is
    // ~8.3% of the canvas. We match that ratio and the rounded-corner aesthetic
    // by drawing a smooth closed outline path.
    const sw = Math.max(1.0, size / 26)
    // Corner radius for the outer shell: ~4% of size (matches Lucide's r=2 on 24px)
    const R = Math.max(0.8, size * 0.04)

    // ── Shell outline path (Lucide-style rounded octagon) ────────────────────
    //
    // The Lucide box shell traces: top-apex → upper-right → lower-right →
    // bottom-apex → lower-left → upper-left → back-apex (closed).
    // Each corner is a small arc. We approximate this with SVG quadratic bezier
    // shortcuts (Q) rather than arc commands because the "corners" of an
    // isometric box are not circular arcs — they're angular joints. A small
    // cutback along each edge before the corner, then a smooth Q bezier through
    // the hard corner point, reproduces the Lucide rounded-corner feel precisely.
    //
    // For each corner vertex V with predecessor A and successor B:
    //   approach point = V − R·normalize(V−A)
    //   depart point   = V + R·normalize(B−V)
    //   arc            = Q V  departPoint
    //
    // This is a path-level operation so we compute it inline.

    function approach(v: [number, number], from: [number, number]): [number, number] {
        const dx = v[0] - from[0]
        const dy = v[1] - from[1]
        const len = Math.sqrt(dx * dx + dy * dy)
        const r = Math.min(R, len * 0.4)  // never eat more than 40% of the edge
        return [v[0] - (dx / len) * r, v[1] - (dy / len) * r]
    }

    function depart(v: [number, number], to: [number, number]): [number, number] {
        const dx = to[0] - v[0]
        const dy = to[1] - v[1]
        const len = Math.sqrt(dx * dx + dy * dy)
        const r = Math.min(R, len * 0.4)
        return [v[0] + (dx / len) * r, v[1] + (dy / len) * r]
    }

    // Outer silhouette vertices — clockwise from topmost screen point:
    //   c2 (front-top-left, topmost)  → c3 (front-top-right, rightmost)
    //   → c1 (front-bottom-right)     → c5 (back-bottom-right, bottommost)
    //   → c4 (back-bottom-left)       → c6 (back-top-left, leftmost)
    const verts: Array<[number, number]> = [c2, c3, c1, c5, c4, c6]
    const n = verts.length

    // Build rounded-corner path
    const pathParts: string[] = []
    const startApproach = approach(verts[0], verts[n - 1])
    pathParts.push(`M${f2(startApproach[0])} ${f2(startApproach[1])}`)

    for (let i = 0; i < n; i++) {
        const v = verts[i]
        const next = verts[(i + 1) % n]
        const dep = depart(v, next)
        const app = approach(next, v)
        pathParts.push(`Q${f2(v[0])} ${f2(v[1])} ${f2(dep[0])} ${f2(dep[1])}`)
        pathParts.push(`L${f2(app[0])} ${f2(app[1])}`)
    }
    pathParts.push('Z')
    const shellPath = pathParts.join(' ')

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            fill="none"
            aria-hidden="true"
            className={cn(className)}
            {...props}
        >
            <defs>
                {/* Clip mask = exact rounded shell boundary — prevents face fills
                    and crease lines from bleeding outside the rounded corners */}
                <clipPath id={clipId}>
                    <path d={shellPath} />
                </clipPath>
            </defs>

            {/* ── Interior content clipped to rounded shell ─────────────── */}
            <g clipPath={`url(#${clipId})`}>
                {/* Face tints (overhead lighting model) */}

                {/* Top face — sky-lit, lightest: c2, c3, c7, c6 */}
                <polygon
                    points={joinPts([c2, c3, c7, c6])}
                    fill="currentColor"
                    fillOpacity={0.18}
                />
                {/* Front face — viewer-facing, medium: c2, c3, c1 + hidden corner (0,0,0) clipped */}
                <polygon
                    points={joinPts([c2, c3, c1])}
                    fill="currentColor"
                    fillOpacity={0.10}
                />
                {/* Right/side face — partial shadow, darkest: c3, c1, c5, c7 */}
                <polygon
                    points={joinPts([c3, c1, c5, c7])}
                    fill="currentColor"
                    fillOpacity={0.06}
                />

                {/* Interior 'Y' crease lines — three face-boundary edges from inner peak c7 */}
                {/* Top-face left edge:   c6 → c7 */}
                {/* Top-face front edge:  c7 → c3 */}
                {/* Right-face back edge: c7 → c5 */}
                <polyline
                    points={joinPts([c6, c7, c3])}
                    stroke="currentColor"
                    strokeWidth={sw * 0.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={0.65}
                />
                <line
                    x1={f2(c7[0])} y1={f2(c7[1])}
                    x2={f2(c5[0])} y2={f2(c5[1])}
                    stroke="currentColor"
                    strokeWidth={sw * 0.8}
                    strokeLinecap="round"
                    strokeOpacity={0.65}
                />
            </g>

            {/* ── Outer shell — rendered last so it sits on top ─────────── */}
            <path
                d={shellPath}
                stroke="currentColor"
                strokeWidth={sw}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}
