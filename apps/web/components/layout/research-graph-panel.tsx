'use client'

import { useTranslations } from 'next-intl'
import { ResearchGraph } from '@puckora/research-graph'
import { Caption } from '@puckora/ui'
import { useAppStore } from '@/lib/store'

export function ResearchGraphPanel() {
    const t = useTranslations('nav')
    const slice = useAppStore()

    if (!slice.researchSession) {
        return (
            <div className="flex flex-1 items-center justify-center px-3 text-center">
                <Caption as="p" className="leading-relaxed">{t('graphEmpty')}</Caption>
            </div>
        )
    }

    return <ResearchGraph slice={slice} height="100%" />
}
