'use client'

import { useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import type { TutorialKey } from '@/constants/tutorial'

/**
 * Returns onMouseEnter/onMouseLeave handlers that update the sidebar tutorial
 * panel when the tutorial mode is enabled. Safe to spread onto any JSX element.
 *
 * Usage:
 *   const tutorial = useHoverTutorial(TUTORIAL_KEYS.PRICE_STAT)
 *   return <DataCard {...tutorial}>…</DataCard>
 */
export function useHoverTutorial(key: TutorialKey) {
    const tutorialEnabled = useAppStore((s) => s.tutorialEnabled)
    const setTutorial = useAppStore((s) => s.setTutorial)

    const onMouseEnter = useCallback(() => {
        if (!tutorialEnabled) return
        setTutorial({ key })
    }, [key, tutorialEnabled, setTutorial])

    const onMouseLeave = useCallback(() => {
        if (!tutorialEnabled) return
        setTutorial(null)
    }, [tutorialEnabled, setTutorial])

    if (!tutorialEnabled) return {}

    return { onMouseEnter, onMouseLeave }
}
