'use client'

import { useTranslations } from 'next-intl'
import { Check, ChevronDown } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { cn } from '@/lib/utils'
import {
    AMAZON_CATEGORIES,
    AMAZON_CATEGORY_VALUES,
    CATEGORY_ICON_MAP,
    type AmazonCategoryId,
} from '@/constants/amazon-categories'

const ITEM_CLS =
    'flex w-full cursor-pointer select-none items-center gap-2.5 rounded px-2.5 py-1.5 text-sm text-foreground outline-none hover:bg-accent focus:bg-accent'

export function CategoryBadge({
    selected,
    onToggle,
    onSelectAll,
    onReset,
    disabled,
}: {
    selected: Set<AmazonCategoryId>
    onToggle: (id: AmazonCategoryId) => void
    onSelectAll: () => void
    onReset: () => void
    disabled?: boolean
}) {
    const t = useTranslations('search')
    const allSelected = selected.size === AMAZON_CATEGORY_VALUES.length
    const noneSelected = selected.size === 0

    const isActive = !noneSelected && !allSelected

    const triggerCls = cn(
        'inline-flex h-[30px] items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors cursor-pointer select-none outline-none',
        isActive
            ? 'border-primary/60 text-foreground'
            : 'border-dashed border-border text-muted-foreground',
        disabled && 'pointer-events-none opacity-50',
    )

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={triggerCls}
                    aria-label={t('constraints.category.label')}
                >
                    {!isActive ? (
                        <span className="opacity-60">{t('constraints.category.label')}</span>
                    ) : (
                        <>
                            {AMAZON_CATEGORIES.filter(c => selected.has(c.id))
                                .slice(0, 3)
                                .map(c => {
                                    const Icon = CATEGORY_ICON_MAP[c.iconName]
                                    return <Icon key={c.id} size={13} aria-hidden="true" className="shrink-0" />
                                })}
                            {selected.size > 3 && <span>+{selected.size - 3}</span>}
                        </>
                    )}
                    <ChevronDown size={12} aria-hidden="true" className="shrink-0 opacity-50" />
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="start"
                    side="bottom"
                    sideOffset={4}
                    className="z-50 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-lg outline-none"
                >
                    {/* Pinned: Select all */}
                    {/*  <div className="p-1">
                        <DropdownMenu.Item
                            onSelect={e => { e.preventDefault(); onSelectAll() }}
                            className={ITEM_CLS}
                        >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border">
                                {allSelected && <Check size={10} aria-hidden="true" />}
                            </span>
                            <span className={allSelected ? 'font-medium' : 'text-muted-foreground'}>
                                {t('constraints.category.all')}
                            </span>
                        </DropdownMenu.Item>
                    </div>

                    <div className="h-px bg-border" /> */}

                    {/* Scrollable category list */}
                    <div className="max-h-96 overflow-y-auto p-1">
                        {AMAZON_CATEGORIES.map(cat => {
                            const Icon = CATEGORY_ICON_MAP[cat.iconName]
                            const isChecked = selected.has(cat.id)
                            return (
                                <DropdownMenu.Item
                                    key={cat.id}
                                    onSelect={e => { e.preventDefault(); onToggle(cat.id) }}
                                    className={ITEM_CLS}
                                >
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border">
                                        {isChecked && <Check size={10} aria-hidden="true" />}
                                    </span>
                                    <Icon size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                                    <span className={isChecked ? 'font-medium' : 'text-muted-foreground'}>
                                        {t(`amazonCategories.${cat.labelKey}`)}
                                    </span>
                                </DropdownMenu.Item>
                            )
                        })}
                    </div>

                    <div className="h-px bg-border" />

                    {/* Pinned: Reset */}
                    <div className="p-1">
                        <DropdownMenu.Item
                            onSelect={e => { e.preventDefault(); onReset() }}
                            disabled={noneSelected}
                            className={cn(ITEM_CLS, 'text-muted-foreground', noneSelected && 'opacity-40')}
                        >
                            {t('constraints.category.reset')}
                        </DropdownMenu.Item>
                    </div>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}
