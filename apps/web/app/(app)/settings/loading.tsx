import { PageContainer } from '@/components/layout/page-container'
import { SettingsSkeleton } from '@/app/(app)/settings/_components/settings-skeleton'

export default function SettingsLoading() {
    return (
        <PageContainer>
            <SettingsSkeleton includeHeader />
        </PageContainer>
    )
}
