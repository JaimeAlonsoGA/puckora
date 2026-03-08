'use client'

import { useTranslations } from 'next-intl'
import { Heading, Body } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks'

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const t = useTranslations('errors.generic')

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-[var(--space-4)] text-center">
                <Heading>{t('title')}</Heading>
                <Body>{t('description')}</Body>
                <Button variant="primary" size="sm" onClick={reset}>
                    {t('retry')}
                </Button>
            </div>
        </div>
    )
}
