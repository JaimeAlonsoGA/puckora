import type { SVGProps } from 'react'

export function IsoIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <rect x="15" y="30" width="70" height="40" rx="4" fill="#0d47a1" />
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="28" fill="#fff" letterSpacing="2">ISO</text>
        </svg>
    )
}
