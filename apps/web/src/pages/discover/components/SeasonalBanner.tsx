import React from 'react'
import { useT } from '@/hooks/useT'
import { SilkAlert } from '@repo/ui'

interface SeasonalSignal {
    /** Month ranges (1-based) during which this signal is active */
    activeMonths: number[]
    titleKey: keyof ReturnType<typeof useT<'discover'>>['t'] extends never ? string : string
    bodyKey: string
}

const SIGNALS: SeasonalSignal[] = [
    { activeMonths: [10, 11, 12], titleKey: 'seasonal.q4Title', bodyKey: 'seasonal.q4Body' },
    { activeMonths: [5, 6], titleKey: 'seasonal.primeTitle', bodyKey: 'seasonal.primeBody' },
    { activeMonths: [7, 8, 9], titleKey: 'seasonal.backToSchoolTitle', bodyKey: 'seasonal.backToSchoolBody' },
]

export function SeasonalBanner() {
    const { t } = useT('discover')
    const currentMonth = new Date().getMonth() + 1

    const active = SIGNALS.find(s => s.activeMonths.includes(currentMonth))
    if (!active) return null

    return (
        <SilkAlert variant="gold">
            <strong>{t(active.titleKey as never)}</strong>{' '}
            {t(active.bodyKey as never)}
        </SilkAlert>
    )
}
