import React, { useEffect, useState } from 'react'
import { createFileRoute, useNavigate, useSearch, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { Heading, Body, Small } from '@/components/building-blocks/typography'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/auth/callback')({
    validateSearch: (s: Record<string, unknown>) => ({
        redirect: typeof s.redirect === 'string' ? s.redirect : undefined,
    }),
    component: AuthCallbackPage,
})

function AuthCallbackPage() {
    const { t } = useTranslation('auth')
    const navigate = useNavigate()
    const search = useSearch({ from: '/auth/callback' })
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                navigate({ to: search.redirect ?? '/' })
                return
            }
            if (event === 'PASSWORD_RECOVERY' && session) {
                navigate({ to: '/auth/reset-password' })
                return
            }
            if (event === 'USER_UPDATED' && session) {
                navigate({ to: '/' })
                return
            }
        })

        supabase.auth.getSession().then(({ data, error: e }) => {
            if (e) { setError(t('callback.errorHint')); return }
            if (data.session) {
                navigate({ to: search.redirect ?? '/' })
            }
        })

        const timeout = setTimeout(() => {
            supabase.auth.getSession().then(({ data }) => {
                if (!data.session) setError(t('callback.errorHint'))
            })
        }, 8000)

        return () => {
            subscription.unsubscribe()
            clearTimeout(timeout)
        }
    }, [navigate, search.redirect, t])

    if (error) {
        return (
            <AuthLayout>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Heading style={{ color: 'var(--sf-error)' }}>{t('callback.error')}</Heading>
                    <Body style={{ color: 'var(--sf-text-sub)' }}>{error}</Body>
                    <Link to="/auth/login" search={{ redirect: undefined, email: undefined, error: undefined }}>
                        <Small style={{ color: 'var(--sf-gold)', cursor: 'pointer' }}>
                            {t('login.title')}
                        </Small>
                    </Link>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-start' }}>
                <LoadingSpinner />
                <Body style={{ color: 'var(--sf-text-sub)' }}>{t('callback.loading')}</Body>
            </div>
        </AuthLayout>
    )
}

function LoadingSpinner() {
    return (
        <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            aria-label="Loading"
            style={{ animation: 'spin 1s linear infinite' }}
        >
            <circle
                cx="16"
                cy="16"
                r="12"
                stroke="var(--sf-border)"
                strokeWidth="2.5"
            />
            <path
                d="M16 4 A12 12 0 0 1 28 16"
                stroke="var(--sf-gold)"
                strokeWidth="2.5"
                strokeLinecap="square"
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </svg>
    )
}
