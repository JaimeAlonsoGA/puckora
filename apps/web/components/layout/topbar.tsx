'use client'

import { useAuth } from '@/hooks/use-auth'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/building-blocks'
import { IconLogout } from '@tabler/icons-react'

export function Topbar() {
    const { user, signOut } = useAuth()
    const t = useTranslations('common')

    return (
        <header
            className={[
                'flex h-[var(--topbar-height)] min-h-[var(--topbar-height)] items-center justify-end',
                'border-b border-[color:var(--border-subtle)]',
                'bg-[color:var(--surface-base)]',
                'px-[var(--space-6)]',
            ].join(' ')}
        >
            <div className="flex items-center gap-[var(--space-3)]">
                {user && (
                    <>
                        <span className="text-[length:var(--text-sm)] text-[color:var(--text-secondary)]">
                            {user.email}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={<IconLogout size={16} />}
                            onClick={signOut}
                        >
                            {t('signOut')}
                        </Button>
                    </>
                )}
            </div>
        </header>
    )
}
