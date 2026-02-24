import React from 'react'
import { cn } from '@repo/utils'

export type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    error?: boolean
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
    ({ className, error, ...props }, ref) => (
        <input
            ref={ref}
            className={cn(
                'w-full rounded border bg-surface-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary transition-colors',
                error ? 'border-error' : 'border-border',
                className,
            )}
            {...props}
        />
    ),
)
FormInput.displayName = 'FormInput'
