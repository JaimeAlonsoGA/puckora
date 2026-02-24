import React, { useRef, useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { Heading, Body } from '@/components/building-blocks/typography'
import { useAuth } from '@/hooks/useAuth'
import { AuthInput, SubmitButton, ErrorMsg } from './login'
import { IconCheck } from '@tabler/icons-react'

export const Route = createFileRoute('/auth/reset-password')({
    component: ResetPasswordPage,
})

function ResetPasswordPage() {
    const { t } = useTranslation('auth')
    const navigate = useNavigate()
    const { updatePassword, session } = useAuth()

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    const passwordRef = useRef<HTMLInputElement>(null)

    useEffect(() => { passwordRef.current?.focus() }, [])

    // Supabase sends a hash fragment with the access/refresh token on the reset link.
    // onAuthStateChange event 'PASSWORD_RECOVERY' fires automatically — session will be set.
    // We just wait until session is present to allow password update.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (password.length < 8) { setError(t('errors.weakPassword')); return }
        if (password !== confirm) { setError(t('errors.passwordMismatch')); return }

        setLoading(true)
        const { error: authError } = await updatePassword(password)
        setLoading(false)

        if (authError) { setError(t('errors.generic')); return }

        setDone(true)
        // Redirect to app after a moment
        setTimeout(() => navigate({ to: '/' }), 1800)
    }

    if (done) {
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
                        <Heading>{t('resetPassword.success')}</Heading>
                        <Body style={{ color: 'var(--sf-text-sub)' }}>{t('resetPassword.successSubtitle')}</Body>
                    </div>
                </div>
                <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Heading>{t('resetPassword.title')}</Heading>
                    <Body style={{ color: 'var(--sf-text-sub)' }}>{t('resetPassword.subtitle')}</Body>
                </div>

                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <AuthInput
                        ref={passwordRef}
                        type="password"
                        label={t('newPassword')}
                        placeholder={t('passwordPlaceholder')}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError('') }}
                        autoComplete="new-password"
                        error={error}
                    />
                    <AuthInput
                        type="password"
                        label={t('confirmPassword')}
                        placeholder={t('passwordPlaceholder')}
                        value={confirm}
                        onChange={e => { setConfirm(e.target.value); setError('') }}
                        autoComplete="new-password"
                    />
                    <SubmitButton loading={loading}>{t('resetPassword.submit')}</SubmitButton>
                    {error && <ErrorMsg>{error}</ErrorMsg>}
                </form>
            </div>
        </AuthLayout>
    )
}
