import React from 'react'
import { cn } from '@repo/utils'

export interface FormToggleProps {
    checked: boolean
    onChange: (checked: boolean) => void
    label?: string
    disabled?: boolean
    className?: string
}

export function FormToggle({ checked, onChange, label, disabled, className }: FormToggleProps) {
    return (
        <label className={cn('inline-flex items-center gap-2 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={disabled}
                    onChange={e => onChange(e.target.checked)}
                />
                <div className={cn(
                    'w-9 h-5 rounded-full transition-colors',
                    checked ? 'bg-accent-primary' : 'bg-border',
                )} />
                <div className={cn(
                    'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                    checked ? 'translate-x-4' : 'translate-x-0',
                )} />
            </div>
            {label && <span className="text-sm text-text-secondary">{label}</span>}
        </label>
    )
}
