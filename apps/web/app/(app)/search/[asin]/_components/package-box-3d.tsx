'use client'

import { useMemo } from 'react'

interface Package3DProps {
    /** Package length in cm (front-face width) */
    lengthCm: number
    /** Package width in cm (depth) */
    widthCm: number
    /** Package height in cm */
    heightCm: number
}

const MAX_PX = 90
const ANGLE = Math.PI / 6 // 30° isometric angle
const COS_A = Math.cos(ANGLE) // ≈ 0.866
const SIN_A = Math.sin(ANGLE) // ≈ 0.5

/**
 * Isometric SVG representation of a 3D box using the package dimensions.
 * Three visible faces (top, right, front) with graduated shading.
 * Proportional to the actual cm values — a taller box renders taller.
 */
export function Package3D({ lengthCm, widthCm, heightCm }: Package3DProps) {
    const { sw, sh, dx, dy, svgW, svgH, pts } = useMemo(() => {
        const max = Math.max(lengthCm, widthCm, heightCm)
        const scale = MAX_PX / max
        const sw = lengthCm * scale // front face width (px)
        const sh = heightCm * scale // front face height (px)
        const sd = widthCm * scale  // depth (px)
        const dx = sd * COS_A        // horizontal projection of depth
        const dy = sd * SIN_A        // vertical projection of depth

        // SVG canvas: x goes 0→(sw+dx), y goes 0→(dy+sh)
        // Front face occupies x:[0, sw], y:[dy, dy+sh]
        // Back face offset: +dx, -dy from front
        const pts = {
            frontTL: [0, dy] as [number, number],
            frontTR: [sw, dy] as [number, number],
            frontBR: [sw, dy + sh] as [number, number],
            frontBL: [0, dy + sh] as [number, number],
            backTL: [dx, 0] as [number, number],
            backTR: [sw + dx, 0] as [number, number],
            backBR: [sw + dx, sh] as [number, number],
        }

        return { sw, sh, dx, dy, svgW: sw + dx + 1, svgH: dy + sh + 1, pts }
    }, [lengthCm, widthCm, heightCm])

    const polyPts = (points: [number, number][]) =>
        points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

    return (
        <svg
            width={Math.ceil(svgW)}
            height={Math.ceil(svgH)}
            viewBox={`0 0 ${svgW.toFixed(1)} ${svgH.toFixed(1)}`}
            style={{ display: 'block', overflow: 'visible' }}
            aria-hidden="true"
        >
            {/* Top face — lightest (catches most light) */}
            <polygon
                points={polyPts([pts.frontTL, pts.frontTR, pts.backTR, pts.backTL])}
                style={{ fill: 'rgba(255,255,255,0.12)', stroke: 'rgba(255,255,255,0.20)', strokeWidth: 0.75 }}
            />
            {/* Right face — darkest (in shadow) */}
            <polygon
                points={polyPts([pts.frontTR, pts.backTR, pts.backBR, pts.frontBR])}
                style={{ fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.14)', strokeWidth: 0.75 }}
            />
            {/* Front face — medium (faces viewer) */}
            <polygon
                points={polyPts([pts.frontTL, pts.frontTR, pts.frontBR, pts.frontBL])}
                style={{ fill: 'rgba(255,255,255,0.08)', stroke: 'rgba(255,255,255,0.18)', strokeWidth: 0.75 }}
            />
        </svg>
    )
}
