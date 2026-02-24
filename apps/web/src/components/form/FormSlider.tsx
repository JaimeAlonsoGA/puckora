import React from 'react'
import { cn } from '@repo/utils'

export interface FormSliderProps {
    label?: string
    min: number
    max: number
    step?: number
    value: number
    onChange: (value: number) => void
    formatValue?: (v: number) => string
    className?: string
}

export function FormSlider({ label, min, max, step = 1, value, onChange, formatValue, className }: FormSliderProps) {
    return (
        <div className={cn('flex flex-col gap-1', className)}>
            {label && (
                <div className="flex justify-between text-xs text-text-muted">
                    <span>{label}</span>
                    <span className="text-text-secondary">{formatValue ? formatValue(value) : value}</span>
                </div>
            )}
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full accent-accent-primary"
            />
            <div className="flex justify-between text-xs text-text-muted">
                <span>{formatValue ? formatValue(min) : min}</span>
                <span>{formatValue ? formatValue(max) : max}</span>
            </div>
        </div>
    )
}
