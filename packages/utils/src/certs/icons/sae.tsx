import type { SVGProps } from 'react'

export function SaeIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <path d="M 5 20 L 95 20 L 80 80 L 20 80 Z" fill="#0277bd" />
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="34" fill="#fff" fontStyle="italic" letterSpacing="2">SAE</text>
        </svg>
    )
}
