'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import type { Route } from 'next'
import { DataCard, RankedList, RankedListItem } from '@puckora/ui'
import { formatCount, shortenCategoryPath } from '@puckora/utils'
import type { TopCategory } from '@puckora/utils'
import { searchQueryRoute } from '@/constants/routes'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'

interface CategoryPortalProps {
    categories: TopCategory[]
}

export function CategoryPortal({ categories }: CategoryPortalProps) {
    const t = useTranslations('search')
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.TOP_CATEGORIES)

    return (
        <DataCard title={t('overview.categoriesTitle')} {...tutorial}>
            <RankedList>
                {categories.map((cat, index) => (
                    <Link
                        key={cat.name}
                        href={searchQueryRoute(cat.name) as Route}
                        className="block transition-colors hover:bg-muted/40"
                    >
                        <RankedListItem
                            rank={index + 1}
                            name={cat.name}
                            value={formatCount(cat.count)}
                            sub={shortenCategoryPath(cat.path)}
                            highlight={index === 0}
                        />
                    </Link>
                ))}
            </RankedList>
        </DataCard>
    )
}
