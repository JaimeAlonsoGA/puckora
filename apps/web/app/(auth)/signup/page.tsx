import { getTranslations } from 'next-intl/server'
import { AppRoute } from '@/lib/routes'
import { Heading, Body } from '@/components/building-blocks/typography'
import { Stack, TextLink } from '@/components/building-blocks'
import { SignupForm } from '../_components/signup-form'

/**
 * Signup page — Server Component.
 *
 * Static chrome (heading, footer link) is rendered on the server with zero
 * client JS. Only <SignupForm> crosses the 'use client' boundary, which is
 * the minimum required for interactivity (react-hook-form, useTransition).
 */
export default async function SignupPage() {
    const t = await getTranslations('auth.signup')

    return (
        <Stack gap="6">
            <Stack gap="2" className="text-center">
                <Heading as="h1">{t('title')}</Heading>
                <Body>{t('description')}</Body>
            </Stack>

            <SignupForm />

            <Body as="p" size="sm" className="text-center">
                {t('hasAccount')}{' '}
                <TextLink href={AppRoute.login}>{t('signIn')}</TextLink>
            </Body>
        </Stack>
    )
}
