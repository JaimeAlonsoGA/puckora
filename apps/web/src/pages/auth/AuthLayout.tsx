import React from 'react'
import { useTranslation } from 'react-i18next'
import { Body, Small } from '@/components/building-blocks/typography'

interface AuthLayoutProps {
    children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
    const { t } = useTranslation('auth')

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                background: 'var(--sf-bg)',
            }}
        >
            {/* Left brand panel — hidden on mobile */}
            <div
                className="hidden lg:flex"
                style={{
                    width: '420px',
                    flexShrink: 0,
                    background: 'var(--sf-surface)',
                    borderRight: '1px solid var(--sf-border)',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '48px 40px',
                }}
            >
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <SilkflowMark />
                    <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--sf-text)' }}>
                        Silkflow
                    </span>
                </div>

                {/* Middle tagline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div
                        style={{
                            width: '32px',
                            height: '2px',
                            background: 'var(--sf-gold)',
                        }}
                    />
                    <Body style={{ color: 'var(--sf-text)', fontSize: '18px', lineHeight: '1.5', fontWeight: 500, maxWidth: '280px' }}>
                        {t('tagline')}
                    </Body>
                </div>

                {/* Bottom hint */}
                <Small style={{ color: 'var(--sf-text-muted)' }}>
                    © {new Date().getFullYear()} Silkflow
                </Small>
            </div>

            {/* Right form panel */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 24px',
                }}
            >
                <div style={{ width: '100%', maxWidth: '400px' }}>
                    {/* Mobile logo */}
                    <div className="flex lg:hidden" style={{ justifyContent: 'center', marginBottom: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <SilkflowMark />
                            <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--sf-text)' }}>
                                Silkflow
                            </span>
                        </div>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    )
}

function SilkflowMark() {
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="28" height="28" fill="var(--sf-gold)" />
            <path d="M8 8h5v12H8zM15 8h5v5h-5zM15 15h5v5h-5z" fill="var(--sf-text-inv)" />
        </svg>
    )
}
