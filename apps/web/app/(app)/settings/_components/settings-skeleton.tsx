import { SkeletonPageHeader, SkeletonPanel } from '@/components/shared/skeleton'

interface SettingsSkeletonProps {
    includeHeader?: boolean
}

export function SettingsSkeleton({ includeHeader = false }: SettingsSkeletonProps) {
    return (
        <div className="flex flex-col gap-8">
            {includeHeader ? <SkeletonPageHeader eyebrowClassName="hidden" /> : null}

            <div className="flex flex-col gap-8">
                <SkeletonPanel className="h-44" />
                <SkeletonPanel className="h-32" />
                <SkeletonPanel className="h-32" />
                <SkeletonPanel className="h-36" />
            </div>
        </div>
    )
}
