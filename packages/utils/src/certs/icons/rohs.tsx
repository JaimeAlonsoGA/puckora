import type { SVGProps } from 'react'

export function RohsIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <circle cx="50" cy="50" r="45" fill="none" stroke="#2e7d32" strokeWidth="6" />
            <path d="M 30 50 L 45 65 L 75 35" stroke="#2e7d32" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <text x="50%" y="85%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="18" fill="#2e7d32">RoHS</text>
        </svg>
    )
}
