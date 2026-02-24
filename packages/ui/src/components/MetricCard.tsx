import React from 'react'
import { cn } from '@repo/utils'

export interface MetricCardProps {
    label: string
    value: string | number
    trend?: number
    trendLabel?: string
    className?: string
}

export function MetricCard({ label, value, trend, trendLabel, className }: MetricCardProps) {
    return (
        <div className={cn('rounded bg-surface-secondary border border-border p-4', className)}>
            <p className="text-sm text-text-secondary">{label}</p>
            <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
            {trend !== undefined && (
                <p className={cn('text-xs mt-1', trend >= 0 ? 'text-success' : 'text-error')}>
                    {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%{trendLabel ? ` ${trendLabel}` : ''}
                </p>
            )}
        </div>
    )
}
