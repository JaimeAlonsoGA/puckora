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
        <SkeletonPanel className="p-3">
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

export function SearchOverviewSkeleton() {
    return (
        <OverviewLayout>
            <OverviewSidebar>
                <SkeletonPanel className="px-4 py-4.5">
                    <div className="flex flex-col gap-3">
                        <SkeletonBlock className="h-3 w-24" />
                        <SkeletonBlock className="h-6 w-40" />
                        <SkeletonBlock className="h-3 w-28" />
                        <div className="mt-2 flex flex-col gap-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <SkeletonBlock className="h-3.5 w-28" />
                                    <SkeletonBlock className="h-5 w-16 rounded-sm" />
                                </div>
                            ))}
                        </div>
                    </div>
                </SkeletonPanel>
            </OverviewSidebar>

            <OverviewMain>
                <OverviewMainContent>
                    <div className="flex items-center gap-2">
                        <SkeletonBlock className="h-4 w-32" />
                        <SkeletonBlock className="h-4 w-20" />
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <SearchMetricCardSkeleton key={index} />
                        ))}
                    </div>

                    <div className="flex flex-row gap-2">
                        <div className="flex-3 min-w-0">
                            <SearchDataCardSkeleton rows={4} />
                        </div>
                        <div className="flex-2 min-w-0 flex flex-col gap-2">
                            <SearchDataCardSkeleton rows={3} />
                            <SearchDataCardSkeleton rows={3} />
                        </div>
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

export function SearchResultsSkeleton() {
    return <SearchOverviewSkeleton />
}