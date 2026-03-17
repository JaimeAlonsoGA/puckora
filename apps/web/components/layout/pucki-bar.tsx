'use client'

import { useTranslations } from 'next-intl'
import { Bot } from 'lucide-react'
import { Caption } from '@puckora/ui'

/**
 * PuckiBar — persistent AI assistant bar pinned to the bottom of every view.
 * Always 38px tall. Has context of what the user is looking at via Zustand store.
 */
export function PuckiBar() {
    const t = useTranslations('pucki')

    return (
        <div
            className="flex flex-shrink-0 items-center gap-2 border-t-hairline bg-background px-3.5"
            style={{ height: 'var(--shell-pucki-height)' }}
        >
            {/* Pucki avatar */}
            <div className="flex size-5.5 flex-shrink-0 items-center justify-center rounded-full bg-card border-hairline-default">
                <Bot size={12} aria-hidden="true" className="text-faint" />
            </div>

            {/* Input field (presentational) */}
            <div className="flex h-6.5 flex-1 cursor-text items-center rounded-full bg-card border-hairline px-3">
                <Caption>{t('placeholder')}</Caption>
            </div>
        </div>
    )
}
