import { Suspense } from 'react'
import { getCachedProfile } from '@/lib/server/profile'
import { PageContainer } from '@/components/layout/page-container'
import { Heading, Body } from '@/components/building-blocks/typography'
import { SettingsSkeleton } from '@puckora/web/app/(app)/settings/_components/settings-skeleton'
import { ProfileForm } from '@puckora/web/app/(app)/settings/_components/profile-form'
import { MarketplaceSelector } from '@puckora/web/app/(app)/settings/_components/marketplace-selector'
import { LanguageSelector } from '@puckora/web/app/(app)/settings/_components/language-selector'
import { PlanCard } from '@puckora/web/app/(app)/settings/_components/plan-card'
import { getTranslations } from 'next-intl/server'
import { getProfilePreferences } from '@puckora/types/domain'

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
    const profile = await getCachedProfile()
    const prefs = getProfilePreferences(profile)

    return (
        <div className="mt-[var(--space-8)] flex flex-col gap-[var(--space-8)]">
            <ProfileForm profile={profile} />
            <MarketplaceSelector currentMarketplace={prefs.marketplace} />
            <LanguageSelector currentLanguage={prefs.language} />
            <PlanCard planType={profile.plan} />
        </div>
    )
}
