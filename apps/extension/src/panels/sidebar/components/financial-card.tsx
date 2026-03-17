/**
 * FinancialCard — metric display card, design-system aligned.
 */
import { cn } from '@puckora/utils'

interface FinancialCardProps {
    label: string
    value: string | number | null
    unit?: string
    /** Positive: green, negative: red, neutral: default. */
    sentiment?: 'positive' | 'negative' | 'neutral'
    hint?: string
}

export function FinancialCard({
    label,
    value,
    unit,
    sentiment = 'neutral',
    hint,
}: FinancialCardProps) {
    return (
        <div className="p-3 rounded-md bg-card border border-border-subtle flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {label}
            </span>
            <span
                className={cn(
                    'text-xl font-bold leading-tight',
                    sentiment === 'positive' && 'text-success-fg',
                    sentiment === 'negative' && 'text-error-fg',
                    sentiment === 'neutral' && 'text-foreground',
                )}
            >
                {value !== null && value !== undefined ? (
                    <>
                        {value}
                        {unit && (
                            <span className="text-sm font-normal ml-0.5">{unit}</span>
                        )}
                    </>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </span>
            {hint && (
                <span className="text-xs text-muted-foreground">{hint}</span>
            )}
        </div>
    )
}
