import type { SVGProps } from 'react'

export function UsdaOrganicIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <circle cx="50" cy="50" r="48" fill="#4caf50" />
            <circle cx="50" cy="50" r="40" fill="#fff" />
            <text x="50%" y="45%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="18" fill="#4caf50">USDA</text>
            <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" fill="#795548">ORGANIC</text>
        </svg>
    )
}
