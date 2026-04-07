import type { SVGProps } from 'react'

export function UspIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <circle cx="50" cy="50" r="45" fill="none" stroke="#d4af37" strokeWidth="8" />
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontFamily="Times New Roman, serif" fontWeight="bold" fontSize="36" fill="#00205b">USP</text>
        </svg>
    )
}
