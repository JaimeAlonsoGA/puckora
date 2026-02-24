import React, { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Heading, Body } from '@/components/building-blocks/typography'
import { Stack } from '@/components/building-blocks/layout'
import { AsyncBoundary } from '@/components/shared/AsyncBoundary'
import { EmptyState } from '@/components/shared/EmptyState'
import { SemanticSearch } from '@/pages/categories/components/SemanticSearch'
import { CategoryTree } from '@/pages/categories/components/CategoryTree'
import { useCategoriesTree, useCategoriesSearch } from '@/hooks/useCategoriesTree'
import { IconCategory } from '@tabler/icons-react'

export const Route = createFileRoute('/categories/')({
    component: CategoriesPage,
})

function CategoriesContent() {
    const { t } = useT('categories')
    const [query, setQuery] = useState('')
    const [activeQuery, setActiveQuery] = useState('')

    const treeQuery = useCategoriesTree()
    const searchQuery = useCategoriesSearch(activeQuery)

    const isSearching = activeQuery.length > 0
    const nodes = isSearching ? searchQuery.data : treeQuery.data
    const isFetching = isSearching ? searchQuery.isFetching : treeQuery.isFetching

    return (
        <Stack gap="xl">
            <Stack gap="xs">
                <Heading>{t('title')}</Heading>
                <Body className="text-text-muted">{t('subtitle')}</Body>
            </Stack>

            <SemanticSearch
                value={query}
                onChange={setQuery}
                onSearch={() => setActiveQuery(query.trim())}
                loading={isFetching}
            />

            {isFetching && (
                <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent animate-spin" />
                </div>
            )}

            {!isFetching && nodes?.length === 0 && (
                <EmptyState
                    icon={<IconCategory size={32} />}
                    title={t('search.noResults')}
                />
            )}

            {!isFetching && nodes && nodes.length > 0 && (
                <CategoryTree nodes={nodes} />
            )}
        </Stack>
    )
}

function CategoriesPage() {
    return (
        <PageContainer>
            <AsyncBoundary>
                <CategoriesContent />
            </AsyncBoundary>
        </PageContainer>
    )
}
