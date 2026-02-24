import React, { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Body } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks/Button'

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
    return (
        <div className="p-6 flex flex-col items-center gap-3 text-center">
            <Body className="text-error">Something went wrong</Body>
            {error.message && <Body className="text-text-muted text-xs">{error.message}</Body>}
            <Button variant="secondary" onClick={resetErrorBoundary}>Retry</Button>
        </div>
    )
}

function LoadingFallback() {
    return (
        <div className="p-6 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
        </div>
    )
}

export interface AsyncBoundaryProps {
    children: React.ReactNode
    loadingFallback?: React.ReactNode
}

export function AsyncBoundary({ children, loadingFallback }: AsyncBoundaryProps) {
    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={loadingFallback ?? <LoadingFallback />}>
                {children}
            </Suspense>
        </ErrorBoundary>
    )
}
