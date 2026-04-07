'use client'

import { useTranslations } from 'next-intl'
import { Check, ChevronDown, Search, SlidersHorizontal } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { Caption, Label, Stack } from '@puckora/ui'
import {
    SEARCH_INPUT_MODE_IDS,
    SEARCH_INPUT_MODES,
    type SearchInputMode,
} from '@/constants/search'

const MODE_ICONS: Record<SearchInputMode, React.ElementType> = {
    [SEARCH_INPUT_MODE_IDS.TEXT]: Search,
    [SEARCH_INPUT_MODE_IDS.CONSTRAINTS]: SlidersHorizontal,
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
                        return (
                            <DropdownMenu.Item
                                key={item.id}
                                onSelect={() => onModeChange(item.id)}
                                className={ITEM_CLS}
                            >
                                <Icon
                                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Stack direction="column" gap="none" className="flex-1 items-start text-left">
                                    <Label className="font-medium text-foreground">{t(item.labelKey)}</Label>
                                    <Caption className="text-muted-foreground">{t(item.descKey)}</Caption>
                                </Stack>
                                {isActive && (
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



