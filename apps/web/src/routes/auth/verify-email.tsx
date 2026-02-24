import React, { useState, useEffect } from 'react'
import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { Heading, Body, Small } from '@/components/building-blocks/typography'
import { useAuth } from '@/hooks/useAuth'
import { IconMail } from '@tabler/icons-react'

export const Route = createFileRoute('/auth/verify-email')({
    validateSearch: (s: Record<string, unknown>) => ({
        email: typeof s.email === 'string' ? s.email : '',
    }),
    component: VerifyEmailPage,
})

function VerifyEmailPage() {
    const { t } = useTranslation('auth')
    const search = useSearch({ from: '/auth/verify-email' })
    const { resendVerification } = useAuth()

    const [resent, setResent] = useState(false)
    const [loading, setLoading] = useState(false)
    const [cooldown, setCooldown] = useState(0)

    // Cooldown timer so user can't spam resend
    useEffect(() => {
        if (cooldown <= 0) return
        const id = setInterval(() => setCooldown(c => c - 1), 1000)
        return () => clearInterval(id)
    }, [cooldown])

    const handleResend = async () => {
        if (!search.email || cooldown > 0) return
        setLoading(true)
        await resendVerification(search.email)
        setLoading(false)
        setResent(true)
        setCooldown(60)
    }

    return (
        <AuthLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Icon */}
                <div
                    style={{
                        width: '48px',
                        height: '48px',
                        background: 'var(--sf-gold-bg, rgba(166,124,0,0.07))',
                        border: '1px solid rgba(166,124,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <IconMail size={22} color="var(--sf-gold)" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Heading>{t('verifyEmail.title')}</Heading>
                    <Body style={{ color: 'var(--sf-text-sub)' }}>
                        {t('verifyEmail.subtitle')}&nbsp;
                        {search.email && (
                            <strong style={{ color: 'var(--sf-text)' }}>{search.email}</strong>
                        )}
                    </Body>
                    <Small style={{ color: 'var(--sf-text-muted)', lineHeight: '1.6', marginTop: '4px' }}>
                        {t('verifyEmail.hint')}
                    </Small>
                </div>

                {/* Resend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading || cooldown > 0}
                        style={{
                            height: '40px',
                            background: 'var(--sf-surface)',
                            border: '1px solid var(--sf-border)',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: cooldown > 0 ? 'var(--sf-text-muted)' : 'var(--sf-text)',
                            cursor: loading || cooldown > 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'border-color 120ms ease',
                            outline: 'none',
                        }}
                    >
                        {resent && cooldown > 0
                            ? `${t('verifyEmail.resendSuccess')} · ${cooldown}s`
                            : t('verifyEmail.resend')}
                    </button>
                </div>

                <Link to="/auth/login" search={{ redirect: undefined, email: undefined, error: undefined }}>
                    <Small style={{ color: 'var(--sf-text-muted)', cursor: 'pointer' }}>
                        ← {t('verifyEmail.backToLogin')}
                    </Small>
                </Link>
            </div>
        </AuthLayout>
    )
}
