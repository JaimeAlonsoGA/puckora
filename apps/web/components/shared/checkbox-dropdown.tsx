'use client'

/**
 * CheckboxDropdown — generic multi-select dropdown using Radix DropdownMenu.
 *
 * Accepts typed items with id + label + optional icon. Selected IDs tracked
 * by the parent as a Set<string>. Styling matches CategoryBadge exactly.
 *
 * Used by:
 *   - CategoryBadge (search composer) via static AMAZON_CATEGORIES adapter
 *   - DiscoverCategoryDropdown (discover filters) via DB AmazonCategory adapter
 */

import { Check, ChevronDown } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { cn } from '@/lib/utils'

export interface CheckboxDropdownItem {
    id: string
    label: string
    Icon?: React.ElementType
}

export interface CheckboxDropdownProps {
    /** Trigger label shown when nothing is selected / all selected */
    placeholder: string
    /** Label for the "reset" footer action */
    resetLabel: string
    items: CheckboxDropdownItem[]
    selected: Set<string>
    onToggle: (id: string) => void
    onReset: () => void
    disabled?: boolean
    /** Optional className for the trigger button */
    triggerClassName?: string
}

const ITEM_CLS =
    'flex w-full cursor-pointer select-none items-center gap-2.5 rounded px-2.5 py-1.5 text-sm text-foreground outline-none hover:bg-accent focus:bg-accent'

export function CheckboxDropdown({
    placeholder,
    resetLabel,
    items,
    selected,
    onToggle,
    onReset,
    disabled,
    triggerClassName,
}: CheckboxDropdownProps) {
    const noneSelected = selected.size === 0
    const isActive = !noneSelected

    const triggerCls = cn(
        'inline-flex h-7.5 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors cursor-pointer select-none outline-none',
        isActive
            ? 'border-primary/60 text-foreground'
            : 'border-dashed border-border text-muted-foreground',
        disabled && 'pointer-events-none opacity-50',
        triggerClassName,
    )

    const selectedItems = items.filter((i) => selected.has(i.id))

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button type="button" disabled={disabled} className={triggerCls} aria-haspopup="listbox">
                    {!isActive ? (
                        <span className="opacity-60">{placeholder}</span>
                    ) : (
                        <>
                            {selectedItems.slice(0, 3).map((item) =>
                                item.Icon ? (
                                    <item.Icon key={item.id} size={13} aria-hidden="true" className="shrink-0" />
                                ) : (
                                    <span key={item.id} className="max-w-[4rem] truncate text-xs">
                                        {item.label}
                                    </span>
                                ),
                            )}
                            {selectedItems.length > 3 && (
                                <span>+{selectedItems.length - 3}</span>
                            )}
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
                    {/* Scrollable item list */}
                    <div className="max-h-96 overflow-y-auto p-1">
                        {items.map((item) => {
                            const isChecked = selected.has(item.id)
                            return (
                                <DropdownMenu.Item
                                    key={item.id}
                                    onSelect={(e) => {
                                        e.preventDefault()
                                        onToggle(item.id)
                                    }}
                                    className={ITEM_CLS}
                                >
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border">
                                        {isChecked && <Check size={10} aria-hidden="true" />}
                                    </span>
                                    {item.Icon && (
                                        <item.Icon
                                            size={14}
                                            aria-hidden="true"
                                            className="shrink-0 text-muted-foreground"
                                        />
                                    )}
                                    <span className={isChecked ? 'font-medium' : 'text-muted-foreground'}>
                                        {item.label}
                                    </span>
                                </DropdownMenu.Item>
                            )
                        })}
                    </div>

                    <div className="h-px bg-border" />

                    {/* Footer: reset */}
                    <div className="p-1">
                        <DropdownMenu.Item
                            onSelect={(e) => {
                                e.preventDefault()
                                onReset()
                            }}
                            disabled={noneSelected}
                            className={cn(
                                ITEM_CLS,
                                'text-muted-foreground',
                                noneSelected && 'opacity-40',
                            )}
                        >
                            {resetLabel}
                        </DropdownMenu.Item>
                    </div>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}
