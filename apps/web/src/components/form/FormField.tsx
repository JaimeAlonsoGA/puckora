import React from 'react'
import { cn } from '@repo/utils'

export interface FormFieldProps {
    label: string
    error?: string
    hint?: string
    required?: boolean
    children: React.ReactNode
    className?: string
}

export function FormField({ label, error, hint, required, children, className }: FormFieldProps) {
    return (
        <div className={cn('flex flex-col gap-1', className)}>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                {label}
                {required && <span className="text-error ml-1">*</span>}
            </label>
            {children}
            {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
            {error && <p className="text-xs text-error">{error}</p>}
        </div>
    )
}
