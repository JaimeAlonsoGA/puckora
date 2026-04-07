import type { SVGProps } from 'react'

export function TtbIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <circle cx="50" cy="50" r="45" fill="#eceff1" stroke="#455a64" strokeWidth="4" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#455a64" strokeWidth="1" strokeDasharray="3,3" />
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="bold" fontSize="32" fill="#455a64">TTB</text>
        </svg>
    )
}
