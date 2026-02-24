import React, { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Heading, Body, Caption } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks/Button'
import { Stack, Row } from '@/components/building-blocks/layout'
import { SearchBar } from '@/pages/research/components/SearchBar'
import { FilterPanel } from '@/pages/research/components/FilterPanel'
import { ResultsGrid } from '@/pages/research/components/ResultsGrid'
import { useAmazonSearch } from '@/hooks/useAmazonSearch'
import { useSaveProduct } from '@/hooks/useTrackerProducts'
import { useProductContext } from '@/contexts/ProductContext'
import type { AmazonProduct } from '@repo/types'
import type { AmazonSearchParams } from '@repo/zod-schemas'
import { IconFilter } from '@tabler/icons-react'

export const Route = createFileRoute('/research/')({
    component: ResearchPage,
})

function ResearchPage() {
    const { t } = useT('research')
    const [query, setQuery] = useState('')
    const [submittedQuery, setSubmittedQuery] = useState('')
    const [filters, setFilters] = useState<Partial<AmazonSearchParams>>({ marketplace: 'US' })
    const [showFilters, setShowFilters] = useState(false)
    const saveProduct = useSaveProduct()
    const { setResearchState } = useProductContext()

    const { data, isFetching } = useAmazonSearch(
        { ...filters, q: submittedQuery },
        submittedQuery.length > 0,
    )

    const results = data?.results ?? []

    function handleSearch() {
        const trimmed = query.trim()
        if (!trimmed) return
        setSubmittedQuery(trimmed)
    }

    // Persist research state in context when results arrive
    React.useEffect(() => {
        if (submittedQuery && results.length > 0) {
            setResearchState({
                keyword: submittedQuery,
                filters: filters as Record<string, unknown>,
                results,
                total: data?.total ?? undefined,
            })
        }
    }, [results, submittedQuery])

    function handleSave(product: AmazonProduct) {
        saveProduct.mutate({ asin: product.asin, marketplace: product.marketplace ?? 'US' })
    }

    return (
        <PageContainer>
            <Stack gap="xl">
                <Heading>{t('title')}</Heading>

                <Stack gap="lg">
                    <Row gap="sm" className="items-stretch">
                        <div className="flex-1">
                            <SearchBar
                                value={query}
                                onChange={setQuery}
                                onSearch={handleSearch}
                                loading={isFetching}
                            />
                        </div>
                        <Button
                            variant={showFilters ? 'primary' : 'ghost'}
                            size="md"
                            onClick={() => setShowFilters(f => !f)}
                            icon={<IconFilter size={14} />}
                        >
                            {t('filters.title')}
                        </Button>
                    </Row>

                    {showFilters && (
                        <FilterPanel filters={filters} onChange={setFilters} />
                    )}

                    {submittedQuery && (
                        <Caption className="text-text-muted text-sm">
                            {isFetching
                                ? 'Searching...'
                                : results.length > 0
                                    ? t('results.count', { count: results.length })
                                    : t('results.empty')
                            }
                        </Caption>
                    )}

                    {results.length > 0 && (
                        <ResultsGrid products={results} onSave={handleSave} />
                    )}
                </Stack>
            </Stack>
        </PageContainer>
    )
}
