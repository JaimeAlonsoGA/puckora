import type { SVGProps } from 'react'

export function CoaIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            width={100}
            height={100}
            {...props}
        >
            <rect
                x={15}
                y={10}
                width={70}
                height={80}
                rx={4}
                fill="#f8f9fa"
                stroke="#1565c0"
                strokeWidth={4}
            />
            <path
                d="M 25 30 L 75 30 M 25 45 L 75 45 M 25 60 L 55 60"
                stroke="#90caf9"
                strokeWidth={4}
                strokeLinecap="round"
            />
            <circle cx={70} cy={70} r={14} fill="#1565c0" />
            <path
                d="M 64 70 L 68 74 L 76 65"
                stroke="#fff"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <text
                x="50%"
                y={22}
                dominantBaseline="middle"
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontWeight={900}
                fontSize={16}
                fill="#1565c0"
            >
                {"CoA"}
            </text>
        </svg>
    );
}