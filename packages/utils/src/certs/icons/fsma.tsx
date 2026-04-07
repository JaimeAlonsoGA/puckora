import type { SVGProps } from 'react'

export function FsmaIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <rect x="5" y="15" width="90" height="70" rx="8" fill="#1b5e20" />
            <path d="M 20 85 Q 50 40 80 85" fill="none" stroke="#a5d6a7" strokeWidth="4" opacity="0.6" />
            <path d="M 35 85 Q 50 50 65 85" fill="none" stroke="#a5d6a7" strokeWidth="4" opacity="0.6" />
            <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="28" fill="#fff" letterSpacing="2">FSMA</text>
            <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10" fill="#a5d6a7">FOOD SAFETY</text>
        </svg>
    )
}
