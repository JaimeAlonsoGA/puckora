'use client'

import { useTranslations } from 'next-intl'
import { Button, Caption, Stack } from '@puckora/ui'
import type { AmazonCategory } from '@puckora/types'

// ---------------------------------------------------------------------------
// Category panel
// ---------------------------------------------------------------------------

export function CategoryPanel({
    categories,
    onSearch,
}: {
    categories: AmazonCategory[]
    onSearch: (q: string) => void
}) {
    const t = useTranslations('search')

    return (
        <Stack gap="3">
            <Caption as="p">{t('browseByCategory')}</Caption>
            <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                    <Button
                        key={cat.id}
                        onClick={() => onSearch(cat.name)}
                        variant="ghost"
                        size="sm"
                        className="flex h-auto cursor-pointer flex-col items-start gap-1 rounded-md border border-border-subtle bg-background px-3 py-2.5 text-left hover:border-border"
                    >
                        <Caption as="span" className="font-medium text-foreground">{cat.name}</Caption>
                    </Button>
                ))}

                {/* All categories */}
                <Button
                    onClick={() => onSearch('all')}
                    variant="ghost"
                    size="sm"
                    className="flex h-auto cursor-pointer items-center justify-center rounded-md border border-dashed border-border-subtle px-3 py-2.5 hover:border-border"
                >
                    <Caption as="span">{t('allCategories')} →</Caption>
                </Button>
            </div>
        </Stack>
    )
}
