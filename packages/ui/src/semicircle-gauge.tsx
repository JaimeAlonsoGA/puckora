import { cn } from '@puckora/utils'
import { Caption } from './typography'

/**
 * SemicircleGauge — SVG semicircle arc showing a 0–100% value.
 * The track and fill share the same hue; the track is dimmed to 20% opacity.
 * A text label sits in the arc's centre with an optional sub-label below.
 *
 * viewBox: 0 0 100 54   |   arc: M10,50 A40,40 0 0,1 90,50   |   r = 40
 * Arc length = π × r ≈ 125.66
 *
 * Usage:
 *   <SemicircleGauge pct={74} label="FBA eligibility" sub="small standard" variant="success" />
 */
export type GaugeVariant = 'success' | 'warning' | 'error' | 'default'

type SemicircleGaugeProps = {
    /** 0–100 percentage to fill. */
    pct: number
    label: string
    sub?: string
    variant?: GaugeVariant
    className?: string
}

// Arc path M10,50 A40,40 0 0,1 90,50; perimeter = π × 40
const ARC_LENGTH = Math.PI * 40

const VARIANT_CLASSES: Record<GaugeVariant, string> = {
    success: 'text-success-fg',
    warning: 'text-warning-fg',
    error: 'text-error-fg',
    default: 'text-primary',
}

export function SemicircleGauge({
    pct,
    label,
    sub,
    variant = 'default',
    className,
}: SemicircleGaugeProps) {
    const clamped = Math.max(0, Math.min(100, pct))
    const filled = ((clamped / 100) * ARC_LENGTH).toFixed(2)
    const arcLen = ARC_LENGTH.toFixed(2)
    const colorClass = VARIANT_CLASSES[variant]

    return (
        <div className={cn('flex flex-col items-center gap-0.5', className)}>
            {/*
             * SVG wrapper sets currentColor = variant colour.
             * All stroke + the percentage text inherit it automatically,
             * so track/fill/number are all variant-coloured with no inline styles.
             */}
            <div className={cn('w-28', colorClass)}>
                <svg viewBox="0 0 100 54" className="w-full" aria-hidden="true">
                    {/* Track — same colour, ~20% opacity */}
                    <path
                        d="M10,50 A40,40 0 0,1 90,50"
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                        stroke="currentColor"
                        className="opacity-20"
                    />

                    {/* Fill */}
                    <path
                        d="M10,50 A40,40 0 0,1 90,50"
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                        stroke="currentColor"
                        strokeDasharray={`${filled} ${arcLen}`}
                    />

                    {/* Percentage — inherits variant colour from parent div */}
                    <text
                        x="50"
                        y="42"
                        textAnchor="middle"
                        fontSize="18"
                        fontWeight="600"
                        fill="currentColor"
                    >
                        {Math.round(clamped)}%
                    </text>
                </svg>
            </div>

            {/* Label sits below the arc — meta whisper */}
            {label && (
                <Caption as="p" className="text-xs text-faint text-center leading-none">
                    {label}
                </Caption>
            )}

            {/* Sub-label (e.g. FBA tier) — even smaller context */}
            {sub && (
                <Caption as="p" className="text-xs text-faint text-center">
                    {sub}
                </Caption>
            )}
        </div>
    )
}
