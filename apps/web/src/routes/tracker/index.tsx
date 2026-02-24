import React, { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Heading } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks/Button'
import { Stack, Row } from '@/components/building-blocks/layout'
import { AsyncBoundary } from '@/components/shared/AsyncBoundary'
import { EmptyState } from '@/components/shared/EmptyState'
import { ProductList } from '@/pages/tracker/components/ProductList'
import { ProductComparator } from '@/pages/tracker/components/ProductComparator'
import { useTrackerProducts } from '@/hooks/useTrackerProducts'
import { IconBookmark } from '@tabler/icons-react'

export const Route = createFileRoute('/tracker/')({
    component: TrackerPage,
})

type Tab = 'saved' | 'compare'

function TrackerContent() {
    const { t } = useT('tracker')
    const [tab, setTab] = useState<Tab>('saved')
    const { data: products = [] } = useTrackerProducts()

    return (
        <Stack gap="xl">
            <Row className="justify-between">
                <Heading>{t('title')}</Heading>
                <Row gap="xs">
                    {(['saved', 'compare'] as Tab[]).map((key) => (
                        <Button
                            key={key}
                            variant={tab === key ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setTab(key)}
                        >
                            {t(`tabs.${key}`)}
                        </Button>
                    ))}
                </Row>
            </Row>

            {tab === 'saved' && (
                products.length === 0
                    ? (
                        <EmptyState
                            icon={<IconBookmark size={32} />}
                            title={t('empty.title')}
                            description={t('empty.subtitle')}
                            action={{ label: t('empty.cta'), onClick: () => void 0 }}
                        />
                    )
                    : <ProductList />
            )}

            {tab === 'compare' && <ProductComparator />}
        </Stack>
    )
}

function TrackerPage() {
    return (
        <PageContainer>
            <AsyncBoundary>
                <TrackerContent />
            </AsyncBoundary>
        </PageContainer>
    )
}
