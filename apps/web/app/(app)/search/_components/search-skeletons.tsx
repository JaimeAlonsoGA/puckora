import {
    SkeletonBlock,
    SkeletonCircle,
    SkeletonPanel,
    SkeletonPill,
    SkeletonText,
} from '@/components/shared/skeleton'

export function SearchMetricCardSkeleton() {
    return (
        <SkeletonPanel className="rounded-md p-3">
            <SkeletonBlock className="mb-3 h-3.5 w-24" />
            <SkeletonBlock className="mb-2 h-6 w-20" />
            <SkeletonBlock className="h-3 w-16" />
        </SkeletonPanel>
    )
}

export function SearchDataCardSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <SkeletonPanel className="px-3.5 py-3">
            <SkeletonBlock className="mb-4 h-4 w-36" />
            <div className="flex flex-col gap-2">
                {Array.from({ length: rows }).map((_, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <SkeletonBlock className="h-3.5 w-16" />
                        <SkeletonBlock className="h-2.5 flex-1 rounded-full" />
                        <SkeletonBlock className="h-3.5 w-8" />
                    </div>
                ))}
            </div>
        </SkeletonPanel>
    )
}

export function SearchImageStripSkeleton({ count = 5 }: { count?: number }) {
    return (
        <SkeletonPanel className="px-3.5 py-3">
            <SkeletonBlock className="mb-4 h-4 w-40" />
            <div className="flex gap-1.5">
                {Array.from({ length: count }).map((_, index) => (
                    <SkeletonBlock key={index} className="size-14 shrink-0 rounded-md" />
                ))}
            </div>
            <SkeletonBlock className="mt-3 h-3 w-36" />
        </SkeletonPanel>
    )
}

export function SearchSummarySkeleton() {
    return (
        <SkeletonPanel className="px-3.5 py-3">
            <div className="flex gap-2.5">
                <SkeletonCircle className="mt-0.5 size-5 shrink-0" />
                <SkeletonText className="flex-1" lines={4} />
            </div>
        </SkeletonPanel>
    )
}

export function SearchActionPillsSkeleton() {
    return (
        <div className="flex flex-wrap gap-1.5">
            <SkeletonPill className="w-44" />
            <SkeletonPill className="w-36" />
            <SkeletonPill className="w-32" />
        </div>
    )
}

export function SearchToolbarSkeleton() {
    return (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b-hairline bg-background px-4 py-2">
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-4 w-3" />
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-8 w-20 rounded-md" />
            <SkeletonBlock className="ml-auto h-4 w-24" />
        </div>
    )
}

export function SearchTableHeaderSkeleton() {
    return (
        <div className="grid shrink-0 product-row-grid gap-1.5 border-b-hairline-default bg-background px-4 py-1.75">
            {Array.from({ length: 7 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-4 w-full" />
            ))}
        </div>
    )
}

export function SearchTableRowsSkeleton({ rows = 8 }: { rows?: number }) {
    return (
        <div className="flex-1 overflow-hidden bg-background">
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="grid product-row-grid gap-1.5 border-b-hairline px-4 py-2">
                    <div className="space-y-1">
                        <SkeletonBlock className="h-4 w-[82%]" />
                        <SkeletonBlock className="h-3.5 w-28" />
                    </div>
                    <SkeletonBlock className="h-4 w-12" />
                    <SkeletonBlock className="h-4 w-14" />
                    <SkeletonBlock className="h-4 w-16" />
                    <SkeletonBlock className="h-4 w-14" />
                    <SkeletonBlock className="h-4 w-14" />
                    <SkeletonPill className="h-7 w-20 justify-self-end" />
                </div>
            ))}
        </div>
    )
}

export function SearchOverviewSkeleton() {
    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                <div>
                    <SkeletonBlock className="mb-2 h-3.5 w-40" />
                    <SkeletonBlock className="h-7 w-72 max-w-full" />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <SearchMetricCardSkeleton key={index} />
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <SearchDataCardSkeleton rows={5} />
                    <SearchDataCardSkeleton rows={4} />
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <SearchDataCardSkeleton rows={5} />
                    <SearchDataCardSkeleton rows={4} />
                </div>

                <SearchImageStripSkeleton />

                <SearchSummarySkeleton />

                <SearchActionPillsSkeleton />
            </div>
        </div>
    )
}

export function SearchProductsSkeleton({ rows = 8 }: { rows?: number }) {
    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <SearchToolbarSkeleton />
            <SearchTableHeaderSkeleton />
            <SearchTableRowsSkeleton rows={rows} />
        </div>
    )
}

interface SearchResultsSkeletonProps {
    view?: 'overview' | 'products'
    rows?: number
}

export function SearchResultsSkeleton({ view = 'overview', rows = 8 }: SearchResultsSkeletonProps) {
    if (view === 'products') {
        return <SearchProductsSkeleton rows={rows} />
    }

    return <SearchOverviewSkeleton />
}