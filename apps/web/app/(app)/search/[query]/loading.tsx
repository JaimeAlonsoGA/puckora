import { PageContainer } from '@/components/layout/page-container'

export default function SearchQueryLoading() {
    return (
        <PageContainer>
            {/* Top bar skeleton */}
            <div className="mb-4 flex items-center gap-2">
                <div className="h-7 w-20 animate-pulse rounded-md bg-surface-card" />
                <div className="h-5 w-48 animate-pulse rounded-md bg-surface-card" />
            </div>

            {/* Tab bar skeleton */}
            <div className="mb-4 flex h-8 w-full animate-pulse rounded-md bg-surface-card" />

            {/* Metric cards row */}
            <div className="mb-4 grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-20 animate-pulse rounded-md border border-border-subtle bg-surface-card"
                    />
                ))}
            </div>

            {/* Product rows skeleton */}
            <div className="flex flex-col gap-1">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-12 animate-pulse rounded-md border border-border-subtle bg-surface-card"
                    />
                ))}
            </div>
        </PageContainer>
    )
}
