/**
 * Package3D — isometric SVG representation of a cuboid package.
 *
 * Pure geometric component with no React hooks or state.
 * All three visible faces (front, right, top) use CSS custom-property fills
 * that adapt automatically to light/dark theme.
 *
 * Render is conditional: callers should guard against null dims before mounting.
 */

const COS30 = 0.866025
const SIN30 = 0.5

/** Project a 3-D point to isometric 2-D screen coordinates. */
function toIso(x: number, y: number, z: number): [number, number] {
    return [
        (x - z) * COS30,
        (x + z) * SIN30 - y,
    ]
}

function poly(points: Array<[number, number]>): string {
    return points.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ')
}

interface Package3DProps {
    lengthCm: number
    widthCm: number
    heightCm: number
    className?: string
}

export function Package3D({ lengthCm, widthCm, heightCm, className }: Package3DProps) {
    const maxDim = Math.max(lengthCm, widthCm, heightCm, 0.01)
    const W = lengthCm / maxDim
    const D = widthCm / maxDim
    const H = heightCm / maxDim
    const SCALE = 40

    // 7 unique 2D projected points for a box [W, D, H]
    const p = (x: number, y: number, z: number): [number, number] => {
        const [sx, sy] = toIso(x, y, z)
        return [sx * SCALE, sy * SCALE]
    }

    const O = p(0, 0, 0)  // front-bottom-left (origin)
    const A = p(W, 0, 0)  // front-bottom-right
    const B = p(W, H, 0)  // front-top-right
    const C = p(0, H, 0)  // front-top-left
    const E = p(W, 0, D)  // back-bottom-right
    const F = p(W, H, D)  // back-top-right
    const G = p(0, H, D)  // back-top-left

    const allX = [O, A, B, C, E, F, G].map(([x]) => x)
    const allY = [O, A, B, C, E, F, G].map(([, y]) => y)
    const minX = Math.min(...allX)
    const maxX = Math.max(...allX)
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY)

    const PAD = 2
    const W_SVG = (maxX - minX) + PAD * 2
    const H_SVG = (maxY - minY) + PAD * 2
    const ox = -minX + PAD
    const oy = -minY + PAD

    const s = ([x, y]: [number, number]): [number, number] => [x + ox, y + oy]

    return (
        <svg
            viewBox={`0 0 ${W_SVG.toFixed(1)} ${H_SVG.toFixed(1)}`}
            width={W_SVG.toFixed(1)}
            height={H_SVG.toFixed(1)}
            aria-hidden="true"
            className={className}
        >
            {/* Front face */}
            <polygon
                points={poly([s(O), s(A), s(B), s(C)])}
                fill="var(--card)"
                stroke="var(--border)"
                strokeWidth="0.75"
            />
            {/* Right face */}
            <polygon
                points={poly([s(A), s(E), s(F), s(B)])}
                fill="var(--muted)"
                stroke="var(--border)"
                strokeWidth="0.75"
            />
            {/* Top face */}
            <polygon
                points={poly([s(C), s(B), s(F), s(G)])}
                fill="var(--background)"
                stroke="var(--border)"
                strokeWidth="0.75"
            />
        </svg>
    )
}
