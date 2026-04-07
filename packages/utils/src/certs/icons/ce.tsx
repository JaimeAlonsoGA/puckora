import type { SVGProps } from 'react'

export function CeIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" {...props}>
            <path d="M 45 20 A 30 30 0 1 0 45 80" stroke="#000" strokeWidth="12" fill="none" />
            <path d="M 85 20 A 30 30 0 1 0 85 80" stroke="#000" strokeWidth="12" fill="none" />
            <line x1="55" y1="50" x2="80" y2="50" stroke="#000" strokeWidth="10" />
        </svg>
    )
}
