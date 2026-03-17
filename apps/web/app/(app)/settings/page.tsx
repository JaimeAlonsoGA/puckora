import { Suspense } from 'react'
import { getCachedUser } from '@/server/users'
import { PageContainer } from '@/components/layout/page-container'
import { Heading, Body } from '@puckora/ui'
import { SettingsSkeleton } from '@/app/(app)/settings/_components/settings-skeleton'
import { ProfileForm } from '@/app/(app)/settings/_components/profile-form'
import { MarketplaceSelector } from '@/app/(app)/settings/_components/marketplace-selector'
import { LanguageSelector } from '@/app/(app)/settings/_components/language-selector'
import { ExtensionCard } from '@/app/(app)/settings/_components/extension-card'
import { getTranslations } from 'next-intl/server'

export default async function SettingsPage() {
    const t = await getTranslations('settings')

    return (
        <PageContainer>
            <div className="flex flex-col gap-[var(--space-2)]">
                <Heading as="h1">{t('title')}</Heading>
                <Body>{t('description')}</Body>
            </div>

            <Suspense fallback={<SettingsSkeleton />}>
                <SettingsContent />
            </Suspense>
        </PageContainer>
    )
}

async function SettingsContent() {
    const user = await getCachedUser()

    return (
        <div className="mt-[var(--space-8)] flex flex-col gap-[var(--space-8)]">
            <ProfileForm profile={user} />
            <MarketplaceSelector currentMarketplace={user.marketplace ?? 'US'} />
            <LanguageSelector currentLanguage={user.language ?? 'en'} />
            <ExtensionCard />
        </div>
    )
}
