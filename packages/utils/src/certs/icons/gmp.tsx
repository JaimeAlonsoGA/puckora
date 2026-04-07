import type { SVGProps } from 'react'

export function GmpIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <circle cx="50" cy="50" r="45" fill="#2e7d32" />
            <path d="M 25 65 L 25 35 L 45 35 L 45 45 L 60 45 L 60 35 L 80 35 L 80 65 Z" fill="#fff" opacity="0.15" />
            <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="30" fill="#fff" letterSpacing="2">GMP</text>
            <text x="50%" y="66%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="11" fill="#a5d6a7">CERTIFIED</text>
        </svg>
    )
}
