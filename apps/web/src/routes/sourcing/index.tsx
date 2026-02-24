import React, { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Heading, Body, Caption } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks/Button'
import { Stack, Row } from '@/components/building-blocks/layout'
import { AsyncBoundary } from '@/components/shared/AsyncBoundary'
import { EmptyState } from '@/components/shared/EmptyState'
import { SilkAlert } from '@repo/ui'
import { FormInput } from '@/components/form/FormInput'
import { SupplierList } from '@/pages/sourcing/components/SupplierList'
import { useSuppliersSearch } from '@/hooks/useSuppliersSearch'
import { useProductContext } from '@/contexts/ProductContext'
import { IconSearch, IconTruck, IconSparkles } from '@tabler/icons-react'

export const Route = createFileRoute('/sourcing/')({
    component: SourcingPage,
})

function SourcingContent() {
    const { t } = useT('sourcing')
    const [query, setQuery] = useState('')
    const [submittedQuery, setSubmittedQuery] = useState('')
    const { activeProduct } = useProductContext()

    // Auto-fill search from active product on mount
    useEffect(() => {
        if (activeProduct?.title && !submittedQuery) {
            const searchTerm = activeProduct.title.split(' ').slice(0, 5).join(' ')
            setQuery(searchTerm)
            setSubmittedQuery(searchTerm)
        }
    }, [activeProduct])

    const { data, isFetching, error } = useSuppliersSearch(
        { q: submittedQuery },
        submittedQuery.length > 0,
    )

    function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        setSubmittedQuery(query.trim())
    }

    const results = data?.results ?? []

    return (
        <Stack gap="xl">
            <Stack gap="xs">
                <Heading>{t('title')}</Heading>
                <Body className="text-text-muted">{t('subtitle')}</Body>
            </Stack>

            {/* Pre-fill banner */}
            {activeProduct && (
                <SilkAlert variant="info">
                    <Caption>
                        Searching suppliers for: <strong>{activeProduct.title}</strong>
                    </Caption>
                </SilkAlert>
            )}

            <form onSubmit={handleSearch}>
                <Row gap="sm">
                    <FormInput
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        className="flex-1"
                    />
                    <Button type="submit" icon={<IconSearch size={14} />} loading={isFetching}>
                        {t('search')}
                    </Button>
                </Row>
            </form>

            {error && (
                <Body className="text-error text-sm">{(error as Error).message}</Body>
            )}

            {submittedQuery && !isFetching && results.length === 0 && (
                <EmptyState
                    icon={<IconTruck size={32} />}
                    title={t('results.empty')}
                />
            )}

            {results.length > 0 && (
                <Stack gap="xs">
                    <Caption className="text-text-muted text-xs">
                        {t('results.count', { count: results.length })}
                    </Caption>
                    <SupplierList products={results} />
                </Stack>
            )}
        </Stack>
    )
}

function SourcingPage() {
    return (
        <PageContainer>
            <AsyncBoundary>
                <SourcingContent />
            </AsyncBoundary>
        </PageContainer>
    )
}
