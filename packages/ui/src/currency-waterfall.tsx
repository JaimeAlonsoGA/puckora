import { cloneElement, isValidElement } from 'react'
import { cn } from '@puckora/utils'
import { Caption, Mono } from './typography'

// ---------------------------------------------------------------------------
// CurrencyWaterfall
//
// Fee-cascade breakdown: base price → deduct rows → result row.
// Designed to sit inside a DataCard (inherits horizontal padding from parent).
//
// Usage:
//   <CurrencyWaterfall>
//     <CurrencyWaterfallRow label="Avg sale price" value="$34.00" variant="base" />
//     <CurrencyWaterfallRow label="− FBA fee" value="−$6.10" variant="deduct" />
//     <CurrencyWaterfallRow label="− Referral fee" value="−$5.25" variant="deduct" />
//     <CurrencyWaterfallRow label="≈ Net / unit" value="$22.65" variant="result" />
//   </CurrencyWaterfall>
// ---------------------------------------------------------------------------

type CurrencyWaterfallRowVariant = 'base' | 'deduct' | 'result'

type CurrencyWaterfallRowProps = {
    label: string
    value: React.ReactNode
    variant?: CurrencyWaterfallRowVariant
    className?: string
}

export function CurrencyWaterfall({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('flex flex-col', className)}>{children}</div>
}

export function CurrencyWaterfallRow({
    label,
    value,
    variant = 'base',
    className,
}: CurrencyWaterfallRowProps) {
    const valueClassName = cn(
        'tabular-nums',
        variant === 'base' && 'text-sm text-foreground',
        variant === 'deduct' && 'text-sm text-error-fg',
        variant === 'result' && 'text-xl text-success-fg',
    )

    const renderedValue = isValidElement<{ className?: string }>(value)
        ? cloneElement(value, {
            className: cn(value.props.className, valueClassName),
        })
        : (
            <Mono as="span" className={valueClassName}>
                {value}
            </Mono>
        )

    return (
        <div
            className={cn(
                'flex items-baseline justify-between py-1',
                variant === 'result' && 'mt-0.5 border-t-hairline pt-2',
                className,
            )}
        >
            <Caption
                as="span"
                className={cn(
                    'text-muted-foreground',
                    variant === 'result' && 'font-medium text-foreground',
                )}
            >
                {label}
            </Caption>
            {renderedValue}
        </div>
    )
}
