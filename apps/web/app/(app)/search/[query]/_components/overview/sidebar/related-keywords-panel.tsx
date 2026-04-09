'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { DarkPanel } from '@puckora/ui'
import { cn } from '@puckora/utils'
import { keywordSuggestionsQueryOptions } from '@/queries'
import { AppRoute } from '@/constants/routes'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'

interface RelatedKeywordsPanelProps {
    query: string
}

export function RelatedKeywordsPanel({ query }: RelatedKeywordsPanelProps) {
    const t = useTranslations('search')
    const { data, isPending } = useQuery(keywordSuggestionsQueryOptions(query))
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.RELATED_KEYWORDS)

    const keywords = data?.keywords ?? []

    if (!isPending && keywords.length === 0) return null

    return (
        <div {...tutorial}>
            <DarkPanel
                context={t('relatedKeywords.context')}
                title={query}
            >
                <div className="mt-4 flex flex-col gap-2">
                    {isPending
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-8 w-full animate-pulse rounded-md bg-white/10"
                            />
                        ))
                        : keywords.map((keyword) => {
                            // Ensure display label uses spaces (product_type normalization
                            // replaces underscores but not hyphens that appear in raw values)
                            const label = keyword.replace(/-/g, ' ')
                            return (
                                <Link
                                    key={keyword}
                                    href={`${AppRoute.search}/${encodeURIComponent(label.trim())}`}
                                    className={cn(
                                        'flex items-center gap-2 rounded-md px-3 py-1.5',
                                        'bg-white/8 hover:bg-white/14 transition-colors',
                                        'text-sm text-white/70 hover:text-white/95',
                                        'leading-snug truncate',
                                    )}
                                >
                                    <span className="shrink-0 text-xs text-white/30">→</span>
                                    <span className="truncate">{label}</span>
                                </Link>
                            )
                        })
                    }
                </div>
            </DarkPanel>
        </div>
    )
}
