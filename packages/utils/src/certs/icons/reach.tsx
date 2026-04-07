import type { SVGProps } from 'react'

export function ReachIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <rect x="5" y="15" width="90" height="70" rx="6" fill="#1a237e" />
            <path d="M 45 25 L 55 25 L 55 40 L 70 65 L 70 75 L 30 75 L 30 65 L 45 40 Z" fill="#fff" opacity="0.1" />
            <text x="50%" y="45%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="24" fill="#fff" letterSpacing="3">REACH</text>
            <text x="50%" y="70%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="8" fill="#9fa8da">EU CHEMICAL REG.</text>
        </svg>
    )
}
