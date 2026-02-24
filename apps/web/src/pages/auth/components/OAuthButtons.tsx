import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Small } from '@/components/building-blocks/typography'

interface OAuthButtonsProps {
    mode: 'login' | 'signup'
    onGoogle: () => Promise<{ error: unknown }>
    onAmazon?: () => Promise<{ error: unknown }>
}

export function OAuthButtons({ mode, onGoogle, onAmazon }: OAuthButtonsProps) {
    const { t } = useTranslation('auth')
    const [loadingGoogle, setLoadingGoogle] = useState(false)
    const [loadingAmazon, setLoadingAmazon] = useState(false)

    const handleGoogle = async () => {
        setLoadingGoogle(true)
        await onGoogle()
        setLoadingGoogle(false)
    }

    const handleAmazon = async () => {
        if (!onAmazon) return
        setLoadingAmazon(true)
        await onAmazon()
        setLoadingAmazon(false)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Divider */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '4px',
                }}
            >
                <div style={{ flex: 1, height: '1px', background: 'var(--sf-border)' }} />
                <Small style={{ color: 'var(--sf-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '10px' }}>
                    {mode === 'login' ? t('login.orContinueWith') : t('signup.orContinueWith')}
                </Small>
                <div style={{ flex: 1, height: '1px', background: 'var(--sf-border)' }} />
            </div>

            {/* Google button */}
            <OAuthBtn
                loading={loadingGoogle}
                onClick={handleGoogle}
                icon={<GoogleIcon />}
                label={mode === 'login' ? t('login.continueWithGoogle') : t('signup.continueWithGoogle')}
            />

            {/* Amazon button — only shown when onAmazon provided + on login */}
            {onAmazon && (
                <OAuthBtn
                    loading={loadingAmazon}
                    onClick={handleAmazon}
                    icon={<AmazonIcon />}
                    label={t('login.continueWithAmazon')}
                />
            )}
        </div>
    )
}

interface OAuthBtnProps {
    loading: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
}

function OAuthBtn({ loading, onClick, icon, label }: OAuthBtnProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            style={{
                width: '100%',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                border: '1px solid var(--sf-border)',
                background: 'var(--sf-bg)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--sf-text)',
                opacity: loading ? 0.6 : 1,
                transition: 'border-color 120ms ease, background 120ms ease',
                outline: 'none',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sf-border-strong)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sf-border)' }}
        >
            {loading ? <Spinner /> : icon}
            <span>{label}</span>
        </button>
    )
}

function Spinner() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ animation: 'spin 0.8s linear infinite' }}>
            <circle cx="8" cy="8" r="6" stroke="var(--sf-border-strong)" strokeWidth="2" strokeDasharray="25 13" />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </svg>
    )
}

function GoogleIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    )
}

function AmazonIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M13.75 9.5c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h5.75c1.1 0 2 .9 2 2v3.5z" fill="#FF9900" />
            <path d="M2 17.5c3.5 2 7.8 3.2 12 3.2 3 0 6.5-.8 9-2.3.4-.2.1-.8-.3-.6-2.3 1-4.9 1.5-7.4 1.5-3.8 0-7.5-.9-10.9-2.6-.3-.2-.7.1-.4.4v.4z" fill="#FF9900" />
            <path d="M20.5 15.8c-.3-.4-.9-.2-1.3.1l-.2.1c-.4.2-.8-.2-.6-.6.4-.8.6-1.7.6-2.6 0-2.2-1.8-4-4-4h-2c-.3 0-.5.2-.5.5s.2.5.5.5h2c1.7 0 3 1.3 3 3 0 .7-.2 1.4-.6 2-.2.4.1.8.5.7l.2-.1c.5-.2 1-.3 1.4 0 .3.2.3.7 0 .9-2 1.4-4.4 2.1-6.9 2.1-3.4 0-6.6-1.1-9.2-3.2-.3-.2-.7.1-.5.5.1.2.3.4.5.5C6 18.2 9.4 19.5 13 19.5c2.9 0 5.7-.9 8-2.6.7-.5.8-1.5.3-2.1h-.8z" fill="#FF9900" />
        </svg>
    )
}
