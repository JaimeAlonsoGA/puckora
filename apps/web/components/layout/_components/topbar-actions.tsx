'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { IconLogout } from '@tabler/icons-react'
import { createClient } from '@/integrations/supabase/client'
import { Button } from '@/components/building-blocks'
import { AppRoute } from '@/constants/routes'

type TopbarActionsProps = {
    email: string
}

/**
 * Client island for the topbar: sign-out button + email display.
 * Receives user email as a server-passed prop — no client session fetch needed.
 */
export function TopbarActions({ email }: TopbarActionsProps) {
    const t = useTranslations('common')
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    async function signOut() {
        await supabase.auth.signOut()
        router.push(AppRoute.login)
    }

    return (
        <div className="flex items-center gap-[var(--space-3)]">
            <span className="text-[length:var(--text-sm)] text-[color:var(--text-secondary)]">
                {email}
            </span>
            <Button
                variant="ghost"
                size="sm"
                icon={<IconLogout size={16} aria-hidden="true" />}
                onClick={signOut}
            >
                {t('signOut')}
            </Button>
        </div>
    )
}
