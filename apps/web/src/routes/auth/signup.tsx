import React, { useRef, useState, useEffect } from 'react'
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { OAuthButtons } from '@/pages/auth/components/OAuthButtons'
import { Heading, Body, Small } from '@/components/building-blocks/typography'
import { useAuth } from '@/hooks/useAuth'
import { AuthInput, SubmitButton, ErrorMsg } from './login'

export const Route = createFileRoute('/auth/signup')({
    validateSearch: (s: Record<string, unknown>) => ({
        email: typeof s.email === 'string' ? s.email : undefined,
    }),
    component: SignupPage,
})

function SignupPage() {
    const { t } = useTranslation('auth')
    const navigate = useNavigate()
    const search = useSearch({ from: '/auth/signup' })
    const { signUpWithEmail, signInWithGoogle, session } = useAuth()

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState(search.email ?? '')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const nameRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (session) navigate({ to: '/' })
    }, [session, navigate])

    useEffect(() => {
        nameRef.current?.focus()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        const trimmedEmail = email.trim()
        const trimmedName = fullName.trim()

        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setError(t('errors.invalidEmail')); return
        }
        if (password.length < 8) { setError(t('errors.weakPassword')); return }

        setLoading(true)
        const { error: authError, needsVerification } = await signUpWithEmail(trimmedEmail, password, trimmedName)
        setLoading(false)

        if (authError) {
            if (authError.message?.toLowerCase().includes('already registered')) {
                setError(t('errors.emailTaken')); return
            }
            setError(t('errors.generic')); return
        }

        if (needsVerification) {
            navigate({ to: '/auth/verify-email', search: { email: trimmedEmail } })
        } else {
            navigate({ to: '/' })
        }
    }

    const handleGoogle = async () => {
        setError('')
        const { error: e } = await signInWithGoogle()
        if (e) setError(t('errors.oauthFailed'))
        return { error: e }
    }

    return (
        <AuthLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Header */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Heading>{t('signup.title')}</Heading>
                    <Body style={{ color: 'var(--sf-text-sub)' }}>{t('signup.subtitle')}</Body>
                </div>

                {/* OAuth */}
                <OAuthButtons mode="signup" onGoogle={handleGoogle} />

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <AuthInput
                        ref={nameRef}
                        type="text"
                        label={t('fullName')}
                        placeholder={t('fullNamePlaceholder')}
                        value={fullName}
                        onChange={e => { setFullName(e.target.value); setError('') }}
                        autoComplete="name"
                    />
                    <AuthInput
                        type="email"
                        label={t('email')}
                        placeholder={t('emailPlaceholder')}
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError('') }}
                        autoComplete="email"
                    />
                    <AuthInput
                        type="password"
                        label={t('password')}
                        placeholder={t('passwordPlaceholder')}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError('') }}
                        autoComplete="new-password"
                    />

                    <SubmitButton loading={loading}>{t('signup.submit')}</SubmitButton>
                    {error && <ErrorMsg>{error}</ErrorMsg>}
                </form>

                {/* Terms */}
                <Small style={{ color: 'var(--sf-text-muted)', lineHeight: '1.5' }}>
                    {t('signup.terms', {
                        terms: t('signup.termsLink'),
                        privacy: t('signup.privacyLink'),
                    })}
                </Small>

                {/* Login link */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Small style={{ color: 'var(--sf-text-muted)' }}>{t('signup.haveAccount')}</Small>
                    <Link to="/auth/login" search={{ redirect: undefined, email: undefined, error: undefined }}>
                        <Small style={{ color: 'var(--sf-gold)', fontWeight: 600, cursor: 'pointer' }}>
                            {t('signup.signIn')}
                        </Small>
                    </Link>
                </div>
            </div>
        </AuthLayout>
    )
}

