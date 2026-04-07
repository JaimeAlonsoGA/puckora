import {
    SkeletonBlock,
    SkeletonCircle,
    SkeletonPanel,
    SkeletonPill,
    SkeletonText,
} from '@/components/shared/skeleton'
import {
    OverviewLayout,
    OverviewMain,
    OverviewMainContent,
    OverviewSidebar,
} from '@/components/layout/overview-layout'

export function SearchMetricCardSkeleton() {
    return (
        <SkeletonPanel className="rounded-none p-3">
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
        <OverviewLayout>
            <OverviewSidebar>
                <div className="bg-dark-panel rounded-xl px-4 py-4.5 flex flex-col gap-3 animate-pulse">
                    <SkeletonBlock className="h-3 w-24 bg-white/10" />
                    <SkeletonBlock className="h-6 w-40 bg-white/10" />
                    <SkeletonBlock className="h-3 w-28 bg-white/10" />
                    <div className="mt-2 flex flex-col gap-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <SkeletonBlock className="h-3.5 w-28 bg-white/10" />
                                <SkeletonBlock className="h-5 w-16 rounded-sm bg-white/10" />
                            </div>
                        ))}
                    </div>
                </div>
            </OverviewSidebar>

            <OverviewMain>
                <OverviewMainContent>
                    <div className="flex items-center gap-2">
                        <SkeletonBlock className="h-4 w-32" />
                        <SkeletonBlock className="h-4 w-20" />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <SearchMetricCardSkeleton key={index} />
                        ))}
                    </div>

                    <div className="grid grid-cols-[1fr_1.4fr] gap-2">
                        <SearchDataCardSkeleton rows={4} />
                        <SearchDataCardSkeleton rows={5} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <SkeletonPill className="w-44" />
                        <SkeletonPill className="w-36" />
                        <SkeletonPill className="w-32" />
                    </div>
                </OverviewMainContent>
            </OverviewMain>
        </OverviewLayout>
    )
}

export function SearchProductsSkeleton({ rows = 8 }: { rows?: number }) {
    return (
        <>
            <SearchToolbarSkeleton />
            <SearchTableHeaderSkeleton />
            <SearchTableRowsSkeleton rows={rows} />
        </>
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