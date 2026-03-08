import { Suspense } from 'react'

type AsyncBoundaryProps = {
    children: React.ReactNode
    fallback: React.ReactNode
}

export function AsyncBoundary({ children, fallback }: AsyncBoundaryProps) {
    return <Suspense fallback={fallback}>{children}</Suspense>
}
