import { getTranslations } from 'next-intl/server'
import { AppRoute } from '@/lib/routes'
import { Heading, Body } from '@/components/building-blocks/typography'
import { Stack, TextLink } from '@/components/building-blocks'
import { LoginForm } from '../_components/login-form'

/**
 * Login page — Server Component.
 *
 * Static chrome (heading, footer link) is rendered on the server with zero
 * client JS. Only <LoginForm> crosses the 'use client' boundary, which is
 * the minimum required for interactivity (react-hook-form, useTransition).
 */
export default async function LoginPage() {
    const t = await getTranslations('auth.login')

    return (
        <Stack gap="6">
            <Stack gap="2" className="text-center">
                <Heading as="h1">{t('title')}</Heading>
                <Body>{t('description')}</Body>
            </Stack>

            <LoginForm />

            <Body as="p" size="sm" className="text-center">
                {t('noAccount')}{' '}
                <TextLink href={AppRoute.signup}>{t('signUp')}</TextLink>
            </Body>
        </Stack>
    )
}
