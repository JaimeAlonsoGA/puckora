import type { SVGProps } from 'react'

export function HaccpIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <circle cx="50" cy="50" r="45" fill="#00695c" />
            <polygon points="50,15 85,75 15,75" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" opacity="0.4" />
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="20" fill="#fff" letterSpacing="1">HACCP</text>
        </svg>
    )
}
