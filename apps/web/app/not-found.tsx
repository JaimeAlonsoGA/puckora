import { getTranslations } from 'next-intl/server'
import { Heading, Body } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks'
import { AppRoute } from '@/constants/routes'

export default async function NotFoundPage() {
    const t = await getTranslations('errors.notFound')

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-[var(--space-4)] text-center">
                <Heading>{t('title')}</Heading>
                <Body>{t('description')}</Body>
                <Button variant="primary" size="sm" href={AppRoute.home}>
                    {t('goHome')}
                </Button>
            </div>
        </div>
    )
}
