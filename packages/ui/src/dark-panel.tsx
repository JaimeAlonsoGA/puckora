import { cn } from '@puckora/utils'

// ---------------------------------------------------------------------------
// DarkPanel / DarkPanelRow
//
// Always-dark command-centre panel — never inverts with the theme.
// Background is hardcoded to #1a1a18 so it reads as dark in both light and
// dark app mode. All text and pill colours are white-based or dark-mode
// bright-status colours for guaranteed contrast.
//
// Usage:
//   <DarkPanel context="Amazon search overview" title="lap desk" subtitle="847 products · US">
//     <DarkPanelRow label="FBA viable"   status="yes"      variant="yes" />
//     <DarkPanelRow label="Demand"       status="strong"   variant="yes" />
//     <DarkPanelRow label="Market space" status="moderate" variant="caution" />
//     <DarkPanelRow label="Competition"  status="high wall" variant="no" />
//   </DarkPanel>
// ---------------------------------------------------------------------------

export const DARK_PANEL_ROW_VARIANT = {
    YES: 'yes',
    CAUTION: 'caution',
    NO: 'no',
} as const

export const DARK_PANEL_ROW_VARIANT_VALUES = [
    DARK_PANEL_ROW_VARIANT.YES,
    DARK_PANEL_ROW_VARIANT.CAUTION,
    DARK_PANEL_ROW_VARIANT.NO,
] as const

export type DarkPanelRowVariant = (typeof DARK_PANEL_ROW_VARIANT_VALUES)[number]

// Pill colours anchored to the always-dark surface — bright status hues that
// read clearly against #1a1a18 regardless of the surrounding app theme.
const ROW_TAG_CLASSES: Record<DarkPanelRowVariant, string> = {
    yes: 'bg-[rgba(29,158,117,0.2)] text-[#5dcaa5]',
    caution: 'bg-[rgba(186,117,23,0.2)] text-[#ef9f27]',
    no: 'bg-[rgba(163,45,45,0.2)]  text-[#f09595]',
}

// ── DarkPanel ───────────────────────────────────────────────────────────────

type DarkPanelProps = React.HTMLAttributes<HTMLDivElement> & {
    /** Small eyebrow label above the title (e.g. "Amazon search overview"). */
    context?: string
    /** The primary centrepiece text (e.g. the keyword). */
    title: string
    /** Supporting meta text (e.g. "847 products · US"). */
    subtitle?: string
}

export function DarkPanel({
    context,
    title,
    subtitle,
    className,
    children,
    ...props
}: DarkPanelProps) {
    return (
        <div
            className={cn(
                'bg-dark-panel rounded-xl px-4 py-4.5 flex flex-col',
                className,
            )}
            {...props}
        >
            {context && (
                <p className="text-xs text-white/40 mb-1 leading-none">
                    {context}
                </p>
            )}

            <p className="text-lg font-medium text-white leading-tight mb-0.5">
                {title}
            </p>

            {subtitle && (
                <p className="text-xs text-white/35 mb-4 leading-relaxed">
                    {subtitle}
                </p>
            )}

            {children && (
                <div className="flex flex-col divide-y divide-white/[0.07]">
                    {children}
                </div>
            )}
        </div>
    )
}

// ── DarkPanelRow ─────────────────────────────────────────────────────────────

type DarkPanelRowProps = {
    /** The dimension label shown on the left (e.g. "FBA viable", "Demand"). */
    label: string
    /** The human-readable signal value (e.g. "yes", "moderate", "high wall"). */
    status: string
    /** Controls the pill badge colour. */
    variant: DarkPanelRowVariant
    className?: string
}

export function DarkPanelRow({
    label,
    status,
    variant,
    className,
}: DarkPanelRowProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-between py-1.75',
                className,
            )}
        >
            <span className="text-xs text-white/65">
                {label}
            </span>

            <span
                className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5',
                    'text-xs font-semibold tracking-wide',
                    ROW_TAG_CLASSES[variant],
                )}
            >
                {status}
            </span>
        </div>
    )
}
