'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import type { Route } from 'next'
import { Caption, DataCard, RankedList, RankedListItem, Stack } from '@puckora/ui'
import { formatCount, shortenCategoryPath } from '@puckora/utils'
import type { TopCategory } from '@puckora/utils'
import { AppRoute } from '@/constants/routes'

interface CategoryPortalProps {
    categories: TopCategory[]
}

export function CategoryPortal({ categories }: CategoryPortalProps) {
    const t = useTranslations('search')

    return (
        <DataCard>
            <Stack direction="row" justify="between" align="center" gap="2" className="mb-2.5">
                <Caption>
                    {t('overview.categoriesTitle')}
                </Caption>
            </Stack>
            <RankedList>
                {categories.map((cat, index) => (
                    <Link
                        key={cat.name}
                        href={AppRoute.categories as Route}
                        className="block hover:bg-muted/40 transition-colors"
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
