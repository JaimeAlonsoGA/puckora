'use client'

import { useTranslations } from 'next-intl'
import { Check, ChevronDown, Square, Pyramid, Circle } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { Caption, Label, Stack } from '@puckora/ui'
import {
    SEARCH_AVAILABLE_INPUT_MODE_VALUES,
    SEARCH_INPUT_MODE_IDS,
    SEARCH_INPUT_MODES,
    type SearchInputMode,
} from '@/constants/search'

const MODE_ICONS: Record<SearchInputMode, React.ElementType> = {
    [SEARCH_INPUT_MODE_IDS.KEYWORD]: Circle,
    [SEARCH_INPUT_MODE_IDS.ASIN]: Square,
    [SEARCH_INPUT_MODE_IDS.DISCOVER]: Pyramid,
}

const ITEM_CLS =
    'flex w-full cursor-pointer select-none items-start gap-3 rounded-md px-3 py-2 text-sm text-foreground outline-none hover:bg-muted focus:bg-muted'

export function InputModeMenu({
    mode,
    onModeChange,
}: {
    mode: SearchInputMode
    onModeChange: (m: SearchInputMode) => void
}) {
    const t = useTranslations('search')
    const ActiveIcon = MODE_ICONS[mode]
    const availableModeSet = new Set<SearchInputMode>(SEARCH_AVAILABLE_INPUT_MODE_VALUES)

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    type="button"
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
                >
                    <ActiveIcon size={14} aria-hidden="true" />
                    <ChevronDown size={12} aria-hidden="true" />
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="start"
                    side="bottom"
                    sideOffset={4}
                    className="z-50 w-64 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg outline-none"
                >
                    {SEARCH_INPUT_MODES.map(item => {
                        const Icon = MODE_ICONS[item.id]
                        const isActive = item.id === mode
                        const isAvailable = availableModeSet.has(item.id)
                        return (
                            <DropdownMenu.Item
                                key={item.id}
                                onSelect={(event) => {
                                    if (!isAvailable) {
                                        event.preventDefault()
                                        return
                                    }
                                    onModeChange(item.id)
                                }}
                                className={`${ITEM_CLS} ${!isAvailable ? 'opacity-60' : ''}`}
                            >
                                <Icon
                                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Stack direction="column" gap="none" className="flex-1 items-start text-left">
                                    <div className="flex items-center gap-2">
                                        <Label className="font-medium text-foreground">{t(item.labelKey)}</Label>
                                        {!isAvailable && (
                                            <Caption className="rounded-sm bg-muted px-1.5 py-0.5 uppercase tracking-[0.14em] text-faint">
                                                {t('inputMode.soon')}
                                            </Caption>
                                        )}
                                    </div>
                                    <Caption className="text-muted-foreground">{t(item.descKey)}</Caption>
                                </Stack>
                                {isActive && isAvailable && (
                                    <Check
                                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                                        aria-hidden="true"
                                    />
                                )}
                            </DropdownMenu.Item>
                        )
                    })}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}



