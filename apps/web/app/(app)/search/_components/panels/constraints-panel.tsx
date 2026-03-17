'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button, Caption, Stack } from '@puckora/ui'
import { cn } from '@puckora/utils'
import {
    CONSTRAINT_GROUPS,
    DEFAULT_CONSTRAINTS,
    type Constraints,
} from '@/constants/search'

// ---------------------------------------------------------------------------
// Constraints panel
// ---------------------------------------------------------------------------

export function ConstraintsPanel({ onApply }: { onApply: (c: Constraints) => void }) {
    const [selected, setSelected] = useState<Constraints>(DEFAULT_CONSTRAINTS)
    const t = useTranslations('search')

    function toggle(key: keyof Constraints, value: string) {
        setSelected((prev) => ({ ...prev, [key]: prev[key] === value ? undefined : value }))
    }

    return (
        <Stack gap="3">
            <Caption as="p">{t('constraintsHint')}</Caption>
            <div className="grid grid-cols-2 gap-2.5">
                {CONSTRAINT_GROUPS.map((group) => (
                    <div
                        key={group.key}
                        className="rounded-md border border-border-subtle bg-background px-3 py-3"
                    >
                        <Caption as="p" className="mb-2 font-medium text-foreground">{t(group.labelKey as any)}</Caption>
                        <Stack direction="row" gap="1-5">
                            {group.options.map((opt) => {
                                const isSel = selected[group.key] === opt.value
                                return (
                                    <Button
                                        key={opt.value}
                                        onClick={() => toggle(group.key, opt.value)}
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            'h-auto rounded-full border px-2.5 py-1 text-sm',
                                            isSel
                                                ? 'border-border bg-card text-foreground'
                                                : 'border-border-subtle bg-transparent text-muted-foreground',
                                        )}
                                    >
                                        {t(opt.labelKey as any)}
                                    </Button>
                                )
                            })}
                        </Stack>
                    </div>
                ))}
            </div>
            <Button variant="secondary" fullWidth onClick={() => onApply(selected)}>
                {t('showMatching')}
            </Button>
        </Stack>
    )
}