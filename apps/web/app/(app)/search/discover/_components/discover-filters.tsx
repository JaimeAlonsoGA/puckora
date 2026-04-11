'use client'

import { useRouter, usePathname } from 'next/navigation'
import { startTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Caption, Label } from '@puckora/ui'
import type { DiscoverFilters } from '@/schemas/discover'
import { AppRoute } from '@/constants/routes'

interface DiscoverFiltersBarProps {
    filters: DiscoverFilters
}

function buildFilterUrl(base: string, updates: Partial<Record<string, string | undefined>>): string {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(updates)) {
        if (value != null && value !== '') params.set(key, value)
    }
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
}

export function DiscoverFiltersBar({ filters }: DiscoverFiltersBarProps) {
    const t = useTranslations('search')
    const router = useRouter()
    const pathname = usePathname()

    function applyFilter(key: keyof DiscoverFilters, raw: string) {
        const updates: Record<string, string | undefined> = {
            minPrice: filters.minPrice != null ? String(filters.minPrice) : undefined,
            maxPrice: filters.maxPrice != null ? String(filters.maxPrice) : undefined,
            minRating: filters.minRating != null ? String(filters.minRating) : undefined,
            minRevenue: filters.minRevenue != null ? String(filters.minRevenue) : undefined,
            minReviews: filters.minReviews != null ? String(filters.minReviews) : undefined,
            [key]: raw === '' ? undefined : raw,
        }
        startTransition(() => {
            router.push(buildFilterUrl(pathname, updates))
        })
    }

    function clearFilters() {
        startTransition(() => {
            router.push(AppRoute.searchDiscover)
        })
    }

    const hasActive =
        filters.minPrice != null ||
        filters.maxPrice != null ||
        filters.minRating != null ||
        filters.minRevenue != null ||
        filters.minReviews != null

    return (
        <div className="flex shrink-0 flex-wrap items-end gap-4 border-b-hairline bg-background px-4 py-3">
            <FilterField
                label={t('discover.minPrice')}
                defaultValue={filters.minPrice != null ? String(filters.minPrice) : ''}
                onBlur={(v) => applyFilter('minPrice', v)}
                placeholder="e.g. 10"
            />
            <FilterField
                label={t('discover.maxPrice')}
                defaultValue={filters.maxPrice != null ? String(filters.maxPrice) : ''}
                onBlur={(v) => applyFilter('maxPrice', v)}
                placeholder="e.g. 50"
            />
            <FilterField
                label={t('discover.minRating')}
                defaultValue={filters.minRating != null ? String(filters.minRating) : ''}
                onBlur={(v) => applyFilter('minRating', v)}
                placeholder="e.g. 4"
            />
            <FilterField
                label={t('discover.minRevenue')}
                defaultValue={filters.minRevenue != null ? String(filters.minRevenue) : ''}
                onBlur={(v) => applyFilter('minRevenue', v)}
                placeholder="e.g. 5000"
            />
            <FilterField
                label={t('discover.minReviews')}
                defaultValue={filters.minReviews != null ? String(filters.minReviews) : ''}
                onBlur={(v) => applyFilter('minReviews', v)}
                placeholder="e.g. 100"
            />
            {hasActive && (
                <button
                    type="button"
                    onClick={clearFilters}
                    className="self-end pb-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    {t('discover.clearFilters')}
                </button>
            )}
        </div>
    )
}

interface FilterFieldProps {
    label: string
    defaultValue: string
    placeholder: string
    onBlur: (value: string) => void
}

function FilterField({ label, defaultValue, placeholder, onBlur }: FilterFieldProps) {
    return (
        <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <input
                type="number"
                min={0}
                step="any"
                defaultValue={defaultValue}
                placeholder={placeholder}
                onBlur={(e) => onBlur(e.currentTarget.value)}
                className="h-8 w-28 rounded-md border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
        </div>
    )
}
