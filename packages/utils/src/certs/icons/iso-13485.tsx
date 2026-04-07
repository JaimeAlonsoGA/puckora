import type { SVGProps } from 'react'

export function Iso13485Icon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <rect x="10" y="20" width="80" height="60" rx="4" fill="#0d47a1" />
            <text x="50%" y="45%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="28" fill="#fff" letterSpacing="1">ISO</text>
            <text x="50%" y="70%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="18" fill="#fff">13485</text>
        </svg>
    )
}
