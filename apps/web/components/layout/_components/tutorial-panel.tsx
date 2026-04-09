'use client'

import { useMessages } from 'next-intl'
import { useAppStore } from '@/lib/store'
import { Body, Caption } from '@puckora/ui'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type TutorialEntry = { title: string; text: string }
type TutorialMessages = {
    panel: { placeholder: string }
    [key: string]: TutorialEntry | { placeholder: string }
}

/**
 * TutorialPanel — displays contextual explanation for the currently hovered metric/card.
 * Uses useMessages() for reliable raw access to tutorial entries by dynamic key.
 */
export function TutorialPanel() {
    const messages = useMessages()
    const tutorialEnabled = useAppStore((s) => s.tutorialEnabled)
    const activeTutorial = useAppStore((s) => s.activeTutorial)

    if (!tutorialEnabled) return null

    const tutorialMessages = (messages.tutorial ?? {}) as TutorialMessages
    const activeContent = activeTutorial
        ? (tutorialMessages[activeTutorial.key] as TutorialEntry | undefined)
        : undefined

    return (
        <div className="flex shrink-0 flex-col border-t-hairline">
            {/* Panel header */}
            <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-2.5">
                <BookOpen size={11} aria-hidden="true" className="shrink-0 text-faint" />
                <Caption as="span" className="font-medium tracking-[.03em]">Tutorial</Caption>
            </div>

            {/* Content area */}
            <div
                className={cn(
                    'px-3 pb-3 transition-all duration-200',
                    activeContent ? 'opacity-100' : 'opacity-50',
                )}
            >
                {activeContent ? (
                    <div className="flex flex-col gap-1">
                        <Body as="p" className="text-xs font-semibold text-foreground leading-snug">
                            {activeContent.title}
                        </Body>
                        <Caption as="p" className="text-xs leading-relaxed text-muted-foreground">
                            {activeContent.text}
                        </Caption>
                    </div>
                ) : (
                    <Caption as="p" className="leading-relaxed text-faint">
                        {tutorialMessages.panel?.placeholder ?? 'Hover any metric or card to see an explanation.'}
                    </Caption>
                )}
            </div>
        </div>
    )
}
