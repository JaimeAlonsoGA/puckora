import React from 'react'
import { cn } from '@repo/utils'

export interface SelectOption {
    label: string
    value: string
}

export type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
    options: SelectOption[]
    error?: boolean
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
    ({ className, error, options, ...props }, ref) => (
        <select
            ref={ref}
            className={cn(
                'w-full rounded border bg-surface-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary transition-colors',
                error ? 'border-error' : 'border-border',
                className,
            )}
            {...props}
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    ),
)
FormSelect.displayName = 'FormSelect'
