import React, { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Small } from '@/components/building-blocks/typography'
import { useAuth } from '@/hooks/useAuth'
import { IconLogout, IconChevronDown } from '@tabler/icons-react'

export function Topbar() {
    const { i18n, t } = useTranslation(['common', 'auth'])
    const { user, signOut } = useAuth()
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const initials = (() => {
        const name = user?.user_metadata?.full_name as string | undefined
        if (name && name.trim()) {
            const parts = name.trim().split(' ')
            const first = parts[0]?.[0] ?? ''
            const second = parts[1]?.[0] ?? ''
            return (first + second).toUpperCase()
        }
        return (user?.email?.[0] ?? 'U').toUpperCase()
    })()

    const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ''

    return (
        <header
            style={{
                height: '48px',
                borderBottom: '1px solid var(--sf-border)',
                background: 'var(--sf-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '0 24px',
                flexShrink: 0,
                gap: '16px',
            }}
        >
            {/* Language toggle */}
            <button
                onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en')}
                style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: 'var(--sf-text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    padding: '0',
                }}
            >
                {i18n.language === 'en' ? 'ES' : 'EN'}
            </button>

            {/* User menu */}
            {user && (
                <div ref={menuRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setOpen(v => !v)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0',
                        }}
                    >
                        {/* Avatar */}
                        <div
                            style={{
                                width: '28px',
                                height: '28px',
                                background: 'var(--sf-gold)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--sf-text-inv)',
                                letterSpacing: '0.02em',
                                flexShrink: 0,
                            }}
                        >
                            {initials}
                        </div>
                        <IconChevronDown
                            size={12}
                            color="var(--sf-text-muted)"
                            style={{ transition: 'transform 180ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
                        />
                    </button>

                    {/* Dropdown */}
                    {open && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                background: 'var(--sf-bg)',
                                border: '1px solid var(--sf-border)',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                minWidth: '200px',
                                zIndex: 999,
                                animation: 'fadeIn 120ms ease',
                            }}
                        >
                            {/* User info */}
                            <div
                                style={{
                                    padding: '12px 16px',
                                    borderBottom: '1px solid var(--sf-border)',
                                }}
                            >
                                <Small style={{ color: 'var(--sf-text)', fontWeight: 600, display: 'block' }}>
                                    {displayName}
                                </Small>
                                {user.email && displayName !== user.email && (
                                    <Small style={{ color: 'var(--sf-text-muted)', display: 'block', marginTop: '2px' }}>
                                        {user.email}
                                    </Small>
                                )}
                            </div>

                            {/* Sign out */}
                            <button
                                onClick={() => { setOpen(false); signOut() }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 16px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: 'var(--sf-text-sub)',
                                    textAlign: 'left',
                                    transition: 'background 120ms ease',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--sf-surface)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                            >
                                <IconLogout size={14} color="var(--sf-text-muted)" />
                                {t('auth:logout.signOut')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </header>
    )
}

