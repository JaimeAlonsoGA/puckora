import type { SVGProps } from 'react'

export function DotIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <circle cx="50" cy="50" r="45" fill="none" stroke="#000" strokeWidth="6" />
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="32" fill="#000">DOT</text>
        </svg>
    )
}
