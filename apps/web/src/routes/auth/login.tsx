import React, { useRef, useState, useEffect } from 'react'
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { OAuthButtons } from '@/pages/auth/components/OAuthButtons'
import { Heading, Body, Small } from '@/components/building-blocks/typography'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/auth/login')({
    validateSearch: (s: Record<string, unknown>) => ({
        redirect: typeof s.redirect === 'string' ? s.redirect : undefined,
        email: typeof s.email === 'string' ? s.email : undefined,
        error: typeof s.error === 'string' ? s.error : undefined,
    }),
    component: LoginPage,
})

type Step = 'email' | 'password'

function LoginPage() {
    const { t } = useTranslation('auth')
    const navigate = useNavigate()
    const search = useSearch({ from: '/auth/login' })
    const { signInWithEmail, signInWithGoogle, signInWithAmazon, session } = useAuth()

    const [step, setStep] = useState<Step>('email')
    const [email, setEmail] = useState(search.email ?? '')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(search.error ?? '')
    const [loading, setLoading] = useState(false)

    const emailRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)

    // If already auth → redirect
    useEffect(() => {
        if (session) {
            navigate({ to: search.redirect ?? '/' })
        }
    }, [session, navigate, search.redirect])

    // Pre-fill email step if email search param provided
    useEffect(() => {
        if (search.email) setStep('password')
    }, [search.email])

    // Auto-focus on step change
    useEffect(() => {
        if (step === 'email') emailRef.current?.focus()
        if (step === 'password') passwordRef.current?.focus()
    }, [step])

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        const trimmed = email.trim()
        if (!trimmed) { setError(t('errors.emailRequired')); return }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError(t('errors.invalidEmail')); return }
        setStep('password')
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        const { error: authError } = await signInWithEmail(email.trim(), password)
        setLoading(false)
        if (authError) {
            if (authError.message?.toLowerCase().includes('email not confirmed')) {
                navigate({ to: '/auth/verify-email', search: { email: email.trim() } })
                return
            }
            setError(t('errors.invalidCredentials'))
            return
        }
        navigate({ to: search.redirect ?? '/' })
    }

    const handleGoogle = async () => {
        setError('')
        const { error: e } = await signInWithGoogle()
        if (e) setError(t('errors.oauthFailed'))
        return { error: e }
    }

    const handleAmazon = async () => {
        setError('')
        const { error: e } = await signInWithAmazon()
        if (e) setError(t('errors.oauthFailed'))
        return { error: e }
    }

    const handleBackToEmail = () => {
        setStep('email')
        setPassword('')
        setError('')
    }

    return (
        <AuthLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Header */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Heading>{t('login.title')}</Heading>
                    <Body style={{ color: 'var(--sf-text-sub)' }}>{t('login.subtitle')}</Body>
                </div>

                {/* OAuth */}
                <OAuthButtons mode="login" onGoogle={handleGoogle} onAmazon={handleAmazon} />

                {/* Email step */}
                <div
                    style={{
                        overflow: 'hidden',
                        transition: 'opacity 180ms ease',
                        opacity: step === 'email' ? 1 : 0.4,
                        pointerEvents: step === 'email' ? 'auto' : 'none',
                    }}
                >
                    {step === 'email' && (
                        <form onSubmit={handleEmailSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                            <SubmitButton loading={loading}>{t('login.submit')}</SubmitButton>
                            {error && <ErrorMsg>{error}</ErrorMsg>}
                        </form>
                    )}
                </div>

                {/* Password step — slides down */}
                {step === 'password' && (
                    <form
                        onSubmit={handlePasswordSubmit}
                        noValidate
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            animation: 'slideDown 180ms ease',
                        }}
                    >
                        {/* Email pill — click to go back */}
                        <button
                            type="button"
                            onClick={handleBackToEmail}
                            style={{
                                alignSelf: 'flex-start',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px 4px 6px',
                                background: 'var(--sf-surface)',
                                border: '1px solid var(--sf-border)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: 'var(--sf-text-sub)',
                            }}
                        >
                            <span style={{ fontSize: '10px' }}>←</span>
                            {email}
                        </button>

                        <AuthInput
                            ref={passwordRef}
                            type="password"
                            label={t('password')}
                            placeholder={t('passwordPlaceholder')}
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError('') }}
                            autoComplete="current-password"
                            error={error}
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Link to="/auth/forgot-password" search={{ email: email.trim() }}>
                                <Small style={{ color: 'var(--sf-gold)', cursor: 'pointer' }}>
                                    {t('login.forgotPassword')}
                                </Small>
                            </Link>
                        </div>

                        <SubmitButton loading={loading}>{t('login.submitPassword')}</SubmitButton>
                        {error && <ErrorMsg>{error}</ErrorMsg>}
                    </form>
                )}

                {/* Signup link */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Small style={{ color: 'var(--sf-text-muted)' }}>{t('login.noAccount')}</Small>
                    <Link to="/auth/signup" search={{ email: undefined }}>
                        <Small style={{ color: 'var(--sf-gold)', fontWeight: 600, cursor: 'pointer' }}>
                            {t('login.signUp')}
                        </Small>
                    </Link>
                </div>
            </div>

            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </AuthLayout>
    )
}

// ── Shared form atoms ────────────────────────────────────────────────────────

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string
    error?: string
}

const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
    ({ label, error, ...props }, ref) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sf-text-sub)' }}>
                {label}
            </label>
            <input
                ref={ref}
                style={{
                    height: '40px',
                    padding: '0 12px',
                    fontSize: '14px',
                    color: 'var(--sf-text)',
                    background: 'var(--sf-bg)',
                    border: `1px solid ${error ? 'var(--sf-error)' : 'var(--sf-border)'}`,
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    transition: 'border-color 120ms ease',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--sf-border-strong)' }}
                onBlur={e => { e.currentTarget.style.borderColor = error ? 'var(--sf-error)' : 'var(--sf-border)' }}
                {...props}
            />
        </div>
    )
)
AuthInput.displayName = 'AuthInput'

interface SubmitButtonProps {
    loading?: boolean
    children: React.ReactNode
}

function SubmitButton({ loading, children }: SubmitButtonProps) {
    return (
        <button
            type="submit"
            disabled={loading}
            style={{
                height: '40px',
                width: '100%',
                background: loading ? 'var(--sf-gold-dark)' : 'var(--sf-gold)',
                color: 'var(--sf-text-inv)',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background 120ms ease',
                outline: 'none',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--sf-gold-dark)' }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--sf-gold)' }}
        >
            {loading && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="22 9" />
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </svg>
            )}
            {children}
        </button>
    )
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                padding: '8px 12px',
                background: 'rgba(163, 21, 37, 0.06)',
                borderLeft: '2px solid var(--sf-error)',
                fontSize: '12px',
                color: 'var(--sf-error)',
            }}
        >
            {children}
        </div>
    )
}

export { AuthInput, SubmitButton, ErrorMsg }

