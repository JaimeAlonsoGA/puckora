import type { SVGProps } from 'react'

export function CpcIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <polygon points="50,5 92,25 92,75 50,95 8,75 8,25" fill="#e65100" />
            <polygon points="50,12 85,30 85,70 50,88 15,70 15,30" fill="#fff" />
            <text x="50%" y="45%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="28" fill="#e65100">CPC</text>
            <path d="M 38 62 L 48 72 L 68 50" stroke="#e65100" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}
