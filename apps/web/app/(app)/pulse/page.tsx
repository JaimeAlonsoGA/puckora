import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { PageContainer } from '@/components/layout/page-container'
import { Heading, Body } from '@/components/building-blocks/typography'
import { PulseShell } from '@puckora/web/app/(app)/pulse/_components/pulse-shell'

export default async function PulsePage() {
    const t = await getTranslations('pulse')

    return (
        <PageContainer>
            <div className="flex flex-col gap-[var(--space-2)]">
                <Heading as="h1">{t('title')}</Heading>
                <Body>{t('description')}</Body>
            </div>

            <Suspense>
                <PulseShell />
            </Suspense>
        </PageContainer>
    )
}
