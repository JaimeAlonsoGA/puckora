import type { SVGProps } from 'react'

export function UlIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#000" strokeWidth="8" />
            <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="38" fill="#000" letterSpacing="-2">UL</text>
        </svg>
    )
}
