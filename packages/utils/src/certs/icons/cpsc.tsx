import type { SVGProps } from 'react'

export function CpscIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <circle cx="50" cy="50" r="45" fill="#003087" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4,4" />
            <path d="M 50 15 L 60 40 L 85 40 L 65 55 L 75 80 L 50 65 L 25 80 L 35 55 L 15 40 L 40 40 Z" fill="rgba(255,255,255,0.08)" />
            <text x="50%" y="45%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="22" fill="#fff" letterSpacing="1">CPSC</text>
            <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="9" fill="#90caf9">SAFETY</text>
        </svg>
    )
}
