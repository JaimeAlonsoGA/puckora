import React, { useRef, useState, useEffect } from 'react'
import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { Heading, Body, Small } from '@/components/building-blocks/typography'
import { useAuth } from '@/hooks/useAuth'
import { AuthInput, SubmitButton, ErrorMsg } from './login'
import { IconCheck } from '@tabler/icons-react'

export const Route = createFileRoute('/auth/forgot-password')({
    validateSearch: (s: Record<string, unknown>) => ({
        email: typeof s.email === 'string' ? s.email : undefined,
    }),
    component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
    const { t } = useTranslation('auth')
    const search = useSearch({ from: '/auth/forgot-password' })
    const { resetPassword } = useAuth()

    const [email, setEmail] = useState(search.email ?? '')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const emailRef = useRef<HTMLInputElement>(null)

    useEffect(() => { emailRef.current?.focus() }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = email.trim()
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setError(t('errors.invalidEmail')); return
        }
        setLoading(true)
        await resetPassword(trimmed)
        setLoading(false)
        // Always show success — don't reveal if email exists
        setSent(true)
    }

    if (sent) {
        return (
            <AuthLayout>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slideDown 200ms ease' }}>
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            background: 'rgba(26, 107, 60, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(26, 107, 60, 0.2)',
                        }}
                    >
                        <IconCheck size={20} color="var(--sf-success)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <Heading>{t('forgotPassword.success')}</Heading>
                        <Body style={{ color: 'var(--sf-text-sub)' }}>
                            {t('forgotPassword.successHint')} <strong style={{ color: 'var(--sf-text)' }}>{email}</strong>
                        </Body>
                    </div>
                    <Link to="/auth/login" search={{ redirect: undefined, email: undefined, error: undefined }}>
                        <Small style={{ color: 'var(--sf-gold)', fontWeight: 600, cursor: 'pointer' }}>
                            {t('forgotPassword.backToLogin')}
                        </Small>
                    </Link>
                </div>
                <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Heading>{t('forgotPassword.title')}</Heading>
                    <Body style={{ color: 'var(--sf-text-sub)' }}>{t('forgotPassword.subtitle')}</Body>
                </div>

                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <AuthInput
                        ref={emailRef}
                        type="email"
                        label={t('email')}
                        placeholder={t('emailPlaceholder')}
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError('') }}
                        autoComplete="email"
                        error={error}
                    />
                    <SubmitButton loading={loading}>{t('forgotPassword.submit')}</SubmitButton>
                    {error && <ErrorMsg>{error}</ErrorMsg>}
                </form>

                <Link to="/auth/login" search={{ redirect: undefined, email: undefined, error: undefined }}>
                    <Small style={{ color: 'var(--sf-text-muted)', cursor: 'pointer' }}>
                        ← {t('forgotPassword.backToLogin')}
                    </Small>
                </Link>
            </div>
        </AuthLayout>
    )
}
