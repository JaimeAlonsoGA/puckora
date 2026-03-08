import { PageContainer } from '@/components/layout/page-container'

export default function SettingsLoading() {
    return (
        <PageContainer>
            {/* Header skeleton */}
            <div className="flex flex-col gap-[var(--space-2)]">
                <div className="h-8 w-40 animate-pulse rounded-[var(--radius-md)] bg-[color:var(--surface-card)]" />
                <div className="h-5 w-80 animate-pulse rounded-[var(--radius-md)] bg-[color:var(--surface-card)]" />
            </div>

            <div className="mt-[var(--space-8)] flex flex-col gap-[var(--space-8)]">
                {/* Profile section */}
                <SettingsCardSkeleton height="h-44" />
                {/* Marketplace section */}
                <SettingsCardSkeleton height="h-32" />
                {/* Language section */}
                <SettingsCardSkeleton height="h-32" />
                {/* Plan section */}
                <SettingsCardSkeleton height="h-36" />
            </div>
        </PageContainer>
    )
}

function SettingsCardSkeleton({ height }: { height: string }) {
    return (
        <div
            className={`${height} animate-pulse rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)]`}
        />
    )
}
