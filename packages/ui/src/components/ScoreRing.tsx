import React from 'react'

export interface ScoreRingProps {
    score: number // 0–100
    size?: number
    strokeWidth?: number
    label?: string
    className?: string
}

export function ScoreRing({ score, size = 64, strokeWidth = 6, label, className }: ScoreRingProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const progress = Math.max(0, Math.min(100, score))
    const strokeDashoffset = circumference - (progress / 100) * circumference

    const color =
        progress >= 70 ? '#10B981' :
            progress >= 40 ? '#F59E0B' :
                '#EF4444'

    return (
        <div className={className} style={{ width: size, height: size, position: 'relative' }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#2A2A3A"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </svg>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <span style={{ fontSize: size * 0.22, fontWeight: 600, color: '#F0F0F8' }}>
                    {progress}
                </span>
                {label && (
                    <span style={{ fontSize: size * 0.14, color: '#9090A8' }}>{label}</span>
                )}
            </div>
        </div>
    )
}
