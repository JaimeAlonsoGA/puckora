import React from 'react'
import { cn } from '@repo/utils'

export type FormNumberInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    error?: boolean
    prefix?: string
    suffix?: string
}

export const FormNumberInput = React.forwardRef<HTMLInputElement, FormNumberInputProps>(
    ({ className, error, prefix, suffix, ...props }, ref) => (
        <div className={cn(
            'flex items-center rounded border bg-surface-tertiary focus-within:ring-2 focus-within:ring-accent-primary transition-colors',
            error ? 'border-error' : 'border-border',
        )}>
            {prefix && <span className="pl-3 text-sm text-text-muted shrink-0">{prefix}</span>}
            <input
                ref={ref}
                type="number"
                className={cn(
                    'flex-1 bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none',
                    prefix && 'pl-1',
                    suffix && 'pr-1',
                    className,
                )}
                {...props}
            />
            {suffix && <span className="pr-3 text-sm text-text-muted shrink-0">{suffix}</span>}
        </div>
    ),
)
FormNumberInput.displayName = 'FormNumberInput'
