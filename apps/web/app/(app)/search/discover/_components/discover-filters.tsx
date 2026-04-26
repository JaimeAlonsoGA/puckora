'use client'

import { useEffect, useState, startTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { Caption, Label } from '@puckora/ui'
import { cn } from '@/lib/utils'
import { CheckboxDropdown } from '@/components/shared/checkbox-dropdown'
import { AMAZON_CATEGORIES, CATEGORY_ICON_MAP } from '@/constants/amazon-categories'
import type { DiscoverFilters } from '@/schemas/discover'
import { AppRoute } from '@/constants/routes'

// ─────────────────────────────────────────────────────────────────────────────
// URL helpers (pure, no React dependencies)
// ─────────────────────────────────────────────────────────────────────────────

function buildFilterUrl(base: string, params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value != null && value !== '') qs.set(key, value)
    }
    const str = qs.toString()
    return str ? `${base}?${str}` : base
}

// ─────────────────────────────────────────────────────────────────────────────
// Local state — mirrors URL params as strings (empty string = unset)
// ─────────────────────────────────────────────────────────────────────────────

interface LocalState {
    minPrice: string
    maxPrice: string
    minRating: string
    maxRating: string
    minReviews: string
    maxReviews: string
}

function filtersToLocal(f: DiscoverFilters): LocalState {
    return {
        minPrice: f.minPrice != null ? String(f.minPrice) : '',
        maxPrice: f.maxPrice != null ? String(f.maxPrice) : '',
        minRating: f.minRating != null ? String(f.minRating) : '',
        maxRating: f.maxRating != null ? String(f.maxRating) : '',
        minReviews: f.minReviews != null ? String(f.minReviews) : '',
        maxReviews: f.maxReviews != null ? String(f.maxReviews) : '',
    }
}

/** Collapse filter props to a scalar so useEffect can do a stable diff */
function filterKey(f: DiscoverFilters): string {
    return [
        f.minPrice, f.maxPrice,
        f.minRating, f.maxRating,
        f.minReviews, f.maxReviews,
        f.categories.join(','),
    ].join('|')
}

function localToUrlParams(l: LocalState, cats: string[]): Record<string, string | undefined> {
    return {
        minPrice: l.minPrice || undefined,
        maxPrice: l.maxPrice || undefined,
        minRating: l.minRating || undefined,
        maxRating: l.maxRating || undefined,
        minReviews: l.minReviews || undefined,
        maxReviews: l.maxReviews || undefined,
        categories: cats.length > 0 ? cats.join(',') : undefined,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DiscoverFiltersBar
// ─────────────────────────────────────────────────────────────────────────────

interface DiscoverFiltersBarProps {
    filters: DiscoverFilters
}

export function DiscoverFiltersBar({ filters }: DiscoverFiltersBarProps) {
    const t = useTranslations('search')
    const router = useRouter()
    const pathname = usePathname()

    // ── Controlled local state for all range inputs ──────────────────────
    // KEY FIX: using controlled state (not uncontrolled defaultValue) means
    // every commit() call reads the CURRENT typed values, not a stale
    // `filters` prop snapshot from before a pending startTransition navigation.
    const [local, setLocal] = useState<LocalState>(() => filtersToLocal(filters))
    const [selectedCats, setSelectedCats] = useState<Set<string>>(() => new Set(filters.categories))

    // Sync from URL when navigating externally (back/forward nav, page load).
    // filterKey() collapses the object to a scalar — avoids identity issues
    // with Zod's transform producing a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        setLocal(filtersToLocal(filters))
        setSelectedCats(new Set(filters.categories))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterKey(filters)])

    // ── Commit: push ALL current local state to URL ──────────────────────
    function commit(cats?: Set<string>) {
        const resolvedCats = cats ?? selectedCats
        startTransition(() => {
            router.push(buildFilterUrl(pathname, localToUrlParams(local, [...resolvedCats])))
        })
    }

    // ── Category handlers ────────────────────────────────────────────────
    function toggleCategory(id: string) {
        const next = new Set(selectedCats)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedCats(next)
        commit(next)
    }

    function resetCategories() {
        const empty = new Set<string>()
        setSelectedCats(empty)
        commit(empty)
    }

    const hasActive = Object.values(local).some(Boolean) || selectedCats.size > 0

    return (
        <div className="shrink-0 border-b border-border bg-background">
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3 px-4 py-3">
                <RangeFilter
                    label={t('discover.price')}
                    minValue={local.minPrice}
                    maxValue={local.maxPrice}
                    onMinChange={(v) => setLocal((p) => ({ ...p, minPrice: v }))}
                    onMaxChange={(v) => setLocal((p) => ({ ...p, maxPrice: v }))}
                    onCommit={commit}
                    minPlaceholder="Min"
                    maxPlaceholder="Max"
                />
                <RangeFilter
                    label={t('discover.rating')}
                    minValue={local.minRating}
                    maxValue={local.maxRating}
                    onMinChange={(v) => setLocal((p) => ({ ...p, minRating: v }))}
                    onMaxChange={(v) => setLocal((p) => ({ ...p, maxRating: v }))}
                    onCommit={commit}
                    minPlaceholder="0"
                    maxPlaceholder="5"
                    step="0.1"
                    inputWidth="w-16"
                />
                <RangeFilter
                    label={t('discover.reviews')}
                    minValue={local.minReviews}
                    maxValue={local.maxReviews}
                    onMinChange={(v) => setLocal((p) => ({ ...p, minReviews: v }))}
                    onMaxChange={(v) => setLocal((p) => ({ ...p, maxReviews: v }))}
                    onCommit={commit}
                    minPlaceholder="Min"
                    maxPlaceholder="Max"
                    step="1"
                />

                <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                        {t('discover.categoriesLabel')}
                    </Label>
                    <CheckboxDropdown
                        placeholder={t('discover.allCategories')}
                        resetLabel={t('constraints.category.reset')}
                        items={AMAZON_CATEGORIES.map((cat) => ({
                            id: cat.id,
                            label: t(`amazonCategories.${cat.labelKey}`),
                            Icon: CATEGORY_ICON_MAP[cat.iconName],
                        }))}
                        selected={selectedCats}
                        onToggle={toggleCategory}
                        onReset={resetCategories}
                    />
                </div>

                {hasActive && (
                    <button
                        type="button"
                        onClick={() => {
                            setLocal(filtersToLocal({
                                minPrice: undefined, maxPrice: undefined,
                                minRating: undefined, maxRating: undefined,
                                minReviews: undefined, maxReviews: undefined,
                                categories: [], limit: 100,
                            }))
                            setSelectedCats(new Set())
                            startTransition(() => router.push(AppRoute.searchDiscover))
                        }}
                        className="flex items-center gap-1 self-end pb-0.75 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <X size={12} aria-hidden="true" />
                        {t('discover.clearFilters')}
                    </button>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// RangeFilter — labeled controlled min/max input group
// ─────────────────────────────────────────────────────────────────────────────

interface RangeFilterProps {
    label: string
    minValue: string
    maxValue: string
    onMinChange: (v: string) => void
    onMaxChange: (v: string) => void
    /** Called on blur or Enter — pushes all local state to the URL at once */
    onCommit: () => void
    minPlaceholder: string
    maxPlaceholder: string
    step?: string
    inputWidth?: string
}

function RangeFilter({
    label,
    minValue,
    maxValue,
    onMinChange,
    onMaxChange,
    onCommit,
    minPlaceholder,
    maxPlaceholder,
    step = 'any',
    inputWidth = 'w-24',
}: RangeFilterProps) {
    return (
        <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="flex items-center gap-1">
                <FilterInput
                    value={minValue}
                    placeholder={minPlaceholder}
                    step={step}
                    onChange={onMinChange}
                    onCommit={onCommit}
                    className={inputWidth}
                />
                <Caption className="select-none leading-none text-muted-foreground">–</Caption>
                <FilterInput
                    value={maxValue}
                    placeholder={maxPlaceholder}
                    step={step}
                    onChange={onMaxChange}
                    onCommit={onCommit}
                    className={inputWidth}
                />
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterInput — controlled atomic number input (no label)
// ─────────────────────────────────────────────────────────────────────────────

interface FilterInputProps {
    value: string
    placeholder: string
    step: string
    onChange: (value: string) => void
    onCommit: () => void
    className?: string
}

function FilterInput({ value, placeholder, step, onChange, onCommit, className }: FilterInputProps) {
    return (
        <input
            type="number"
            min={0}
            step={step}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.currentTarget.value)}
            onBlur={() => onCommit()}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur()
                    onCommit()
                }
            }}
            className={cn(
                'h-7.5 rounded-md border border-border bg-background px-2 text-sm text-foreground',
                'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
                '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                className,
            )}
        />
    )
}
