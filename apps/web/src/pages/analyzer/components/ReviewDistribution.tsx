// Review Distribution bar chart — computed from raw review items
import React from 'react'
import type { ReviewItem } from '@repo/types'

export interface ReviewDistributionProps {
    reviews_sample: ReviewItem[]
}

export function ReviewDistributionChart({ reviews_sample }: ReviewDistributionProps) {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews_sample.forEach(r => {
        const star = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5
        if (star in counts) counts[star] = (counts[star] ?? 0) + 1
    })
    const total = reviews_sample.length || 1
    const stars = [5, 4, 3, 2, 1].map(s => ({ label: `${s}★`, value: counts[s] ?? 0 }))

    return (
        <div className="flex flex-col gap-1">
            {stars.map(star => (
                <div key={star.label} className="flex items-center gap-2 text-xs">
                    <span className="w-6 text-text-muted">{star.label}</span>
                    <div className="flex-1 h-2 bg-surface-tertiary overflow-hidden">
                        <div
                            className="h-full bg-accent-primary"
                            style={{ width: `${(star.value / total) * 100}%` }}
                        />
                    </div>
                    <span className="w-8 text-right text-text-muted">{star.value}</span>
                </div>
            ))}
        </div>
    )
}
