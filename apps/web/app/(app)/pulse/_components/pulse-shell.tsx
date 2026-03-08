'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { IconSearch, IconLoader2, IconRefresh } from '@tabler/icons-react'
import { Button } from '@/components/building-blocks'
import { SupplierCard } from '@puckora/web/app/(app)/pulse/_components/supplier-card'
import type { PulseItem, PulseSearchResponse } from '@/lib/pulse/types'
import { AppRoute } from '@/lib/routes'

/**
 * PulseShell — client component that owns the entire Pulse interactive state.
 *
 * State: keyword input → useMutation POST /api/pulse/search → results grid
 * No server state: everything is client-driven for maximum responsiveness.
 */
export function PulseShell() {
    const t = useTranslations('pulse')
    const [keyword, setKeyword] = useState('')
    const [submittedKeyword, setSubmittedKeyword] = useState('')
    const [results, setResults] = useState<PulseItem[]>([])
    const [fromCache, setFromCache] = useState(false)

    const searchMutation = useMutation({
        mutationFn: async (kw: string): Promise<PulseSearchResponse> => {
            const res = await fetch(AppRoute.apiPulseSearch, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: kw, marketplace: 'US', maxProducts: 10 }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error ?? 'Search failed')
            }
            return res.json() as Promise<PulseSearchResponse>
        },
        onSuccess: (data) => {
            setResults(data.items)
            setFromCache(data.cached)
            setSubmittedKeyword(data.keyword)
        },
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const trimmed = keyword.trim()
        if (!trimmed) return
        searchMutation.mutate(trimmed)
    }

    const isSearching = searchMutation.isPending
    const hasError = searchMutation.isError
    const hasResults = results.length > 0

    return (
        <div className="mx-auto w-full max-w-7xl px-8 py-8">
            {/* ── Search bar ─────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="relative flex flex-1 items-center border border-sf-border-strong bg-sf-bg">
                    <IconSearch
                        size={18}
                        className="absolute left-4 flex-shrink-0 text-sf-text-muted"
                    />
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder={t('search.placeholder')}
                        disabled={isSearching}
                        className="w-full bg-transparent py-3 pl-11 pr-4 text-sm text-sf-text outline-none placeholder:text-sf-text-muted"
                    />
                </div>
                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isSearching}
                    disabled={!keyword.trim() || isSearching}
                >
                    {isSearching ? t('search.searching') : t('search.button')}
                </Button>
            </form>

            {/* Search hint */}
            {!hasResults && !hasError && !isSearching ? (
                <p className="mt-2 text-xs text-sf-text-muted">{t('search.hint')}</p>
            ) : null}

            {/* ── Error state ─────────────────────────────────────────────── */}
            {hasError ? (
                <div className="mt-6 border border-sf-error bg-sf-error-bg p-4 text-sm text-sf-error">
                    {t('results.error')}
                </div>
            ) : null}

            {/* ── Results header ──────────────────────────────────────────── */}
            {hasResults ? (
                <div className="mt-6 flex items-center justify-between">
                    <p className="text-xs text-sf-text-muted">
                        {results.length === 1
                            ? t('results.countOne')
                            : t('results.count', { count: results.length })}{' '}
                        <span>·</span>{' '}
                        {t('results.sortedBy')}
                        {fromCache ? (
                            <span className="ml-2 text-sf-gold">
                                ·{' '}
                                <button
                                    type="button"
                                    onClick={() => keyword.length > 0 && searchMutation.mutate(keyword)}
                                    className="inline-flex items-center gap-1 hover:underline"
                                >
                                    <IconRefresh size={12} />
                                    {t('search.refresh')}
                                </button>
                            </span>
                        ) : null}
                    </p>
                </div>
            ) : null}

            {/* ── Results grid ────────────────────────────────────────────── */}
            {hasResults ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {results.map((item) => (
                        <SupplierCard key={item.id} item={item} />
                    ))}
                </div>
            ) : null}

            {/* ── Empty state (after search with no results) ──────────────── */}
            {!hasResults && submittedKeyword.length > 0 && !isSearching && !hasError ? (
                <div className="mt-16 text-center">
                    <p className="text-sm text-sf-text-sub">
                        {t('results.noMatch', { keyword: submittedKeyword })}
                    </p>
                </div>
            ) : null}

            {/* ── Initial empty state ─────────────────────────────────────── */}
            {!hasResults && submittedKeyword.length === 0 && !isSearching ? (
                <div className="mt-16 text-center">
                    <p className="text-sm text-sf-text-muted">{t('results.empty')}</p>
                </div>
            ) : null}
        </div>
    )
}
