import type { SVGProps } from 'react'

export function FdaFacilityIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <rect x="10" y="25" width="80" height="50" rx="8" fill="#0033a0" />
            <text x="50%" y="45%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="28" fill="#fff" letterSpacing="2">FDA</text>
            <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10" fill="#fff">FACILITY</text>
        </svg>
    )
}
