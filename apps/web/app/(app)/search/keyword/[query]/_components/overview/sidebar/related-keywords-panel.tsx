'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Caption, DarkPanel } from '@puckora/ui'
import { cn } from '@puckora/utils'
import { keywordSuggestionsQueryOptions } from '@/queries'
import { searchQueryRoute } from '@/constants/routes'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'

const RELATED_KEYWORD_SKELETON_COUNT = 4
const RELATED_KEYWORD_LINK_CLASS_NAME = cn(
    'flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors',
    'bg-white/8 hover:bg-white/14',
    'text-sm text-white/70 hover:text-white/95',
    'leading-snug truncate',
)

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
                        ? Array.from({ length: RELATED_KEYWORD_SKELETON_COUNT }).map((_, i) => (
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
                                    href={searchQueryRoute(label)}
                                    className={RELATED_KEYWORD_LINK_CLASS_NAME}
                                >
                                    <Caption as="span" className="shrink-0 text-white/30">→</Caption>
                                    <Caption as="span" className="truncate text-white/70">{label}</Caption>
                                </Link>
                            )
                        })
                    }
                </div>
            </DarkPanel>
        </div>
    )
}
