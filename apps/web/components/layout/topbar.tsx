/**
 * Topbar — Server Component.
 *
 * 44px cockpit-style bar: logo · search input · contextual actions · avatar.
 * User data is read on the server; sign-out is a client island.
 */
import { getTranslations } from 'next-intl/server'
import { Search } from 'lucide-react'
import { Body, Caption } from '@puckora/ui'
import { getAuthUser } from '@/server/auth'
import { TopbarActions } from './_components/topbar-actions'

export async function Topbar() {
    const [user, t] = await Promise.all([
        getAuthUser(),
        getTranslations('nav'),
    ])

    return (
        <header
            className="flex flex-shrink-0 items-center gap-2.5 border-b-hairline bg-background px-4"
            style={{
                height: 'var(--shell-topbar-height)',
                minHeight: 'var(--shell-topbar-height)',
            }}
        >
            {/* Logo */}
            <Body as="span" className="text-sm font-medium whitespace-nowrap tracking-[-0.01em]">
                {t('appName')} <em className="font-normal not-italic text-faint">· {t('appTagline')}</em>
            </Body>

            {/* Search bar */}
            <div className="flex h-7 flex-1 items-center gap-1.75 rounded-md border-hairline bg-card px-2.5">
                <Search size={12} aria-hidden="true" className="flex-shrink-0 text-faint" />
                <Caption as="span">{t('topbarSearchPlaceholder')}</Caption>
            </div>

            {/* Right actions (sign-out, avatar) */}
            <TopbarActions email={user.email ?? ''} />
        </header>
    )
}
