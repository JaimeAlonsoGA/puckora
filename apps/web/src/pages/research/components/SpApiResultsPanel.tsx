import React, { useMemo } from 'react'
import type { SpApiTableRow } from '@repo/types'
import { DataTable } from '@repo/ui'
import type { Column } from '@repo/ui'
import { formatCurrency } from '@repo/utils'
import { cn } from '@repo/utils'
import { Button } from '@/components/building-blocks/Button'
import { Stack, Row } from '@/components/building-blocks/layout'
import { Caption, Mono, Small, Body, Subheading } from '@/components/building-blocks/typography'
import { IconTableExport, IconAlertTriangle, IconDatabaseOff } from '@tabler/icons-react'
import { useT } from '@/hooks/useT'

export interface SpApiResultsPanelProps {
    rows: SpApiTableRow[]
    error: Error | null
    marketplace: string
    isPending: boolean
    onExport: () => void
}

export function SpApiResultsPanel({
    rows,
    error,
    marketplace,
    isPending,
    onExport,
}: SpApiResultsPanelProps) {
    const { t } = useT('research')

    const columns = useMemo<Column<SpApiTableRow>[]>(() => [
        {
            key: 'asin',
            header: t('spApi.columns.asin'),
            sortable: false,
            render: (r) => (
                <a
                    href={`https://www.amazon.com/dp/${r.asin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-primary hover:underline"
                >
                    <Mono>{r.asin}</Mono>
                </a>
            ),
        },
        {
            key: 'main_image',
            header: '',
            sortable: false,
            render: (r) =>
                r.main_image ? (
                    <img
                        src={r.main_image}
                        alt={r.title ?? r.asin}
                        className="w-10 h-10 object-contain"
                    />
                ) : (
                    <div className="w-10 h-10 bg-surface-tertiary" />
                ),
        },
        {
            key: 'title',
            header: t('spApi.columns.title'),
            sortable: false,
            render: (r) => (
                <Small className="max-w-[200px] truncate block text-text-secondary">
                    {r.title ?? '—'}
                </Small>
            ),
        },
        {
            key: 'brand',
            header: t('spApi.columns.brand'),
            sortable: true,
            render: (r) => <Small className="text-text-secondary">{r.brand ?? '—'}</Small>,
        },
        {
            key: 'product_type',
            header: t('spApi.columns.category'),
            sortable: true,
            render: (r) => (
                <Caption className="text-text-muted">
                    {r.product_type ?? r.bsr_category ?? '—'}
                </Caption>
            ),
        },
        {
            key: 'bsr',
            header: t('spApi.columns.bsr'),
            sortable: true,
            render: (r) => (
                <Mono className="text-text-primary">
                    {r.bsr != null ? `#${r.bsr.toLocaleString()}` : '—'}
                </Mono>
            ),
        },
        {
            key: 'buy_box_price',
            header: t('spApi.columns.buyBox'),
            sortable: true,
            render: (r) => (
                <Mono>{r.buy_box_price != null ? formatCurrency(r.buy_box_price) : '—'}</Mono>
            ),
        },
        {
            key: 'lowest_new_price',
            header: t('spApi.columns.lowestNew'),
            sortable: true,
            render: (r) => (
                <Mono className="text-text-secondary">
                    {r.lowest_new_price != null ? formatCurrency(r.lowest_new_price) : '—'}
                </Mono>
            ),
        },
        {
            key: 'total_offer_count',
            header: t('spApi.columns.sellers'),
            sortable: true,
            render: (r) => (
                <Mono>{r.total_offer_count?.toLocaleString() ?? '—'}</Mono>
            ),
        },
        {
            key: 'referral_fee',
            header: t('spApi.columns.referral'),
            sortable: true,
            render: (r) => (
                <Mono className="text-text-secondary">
                    {r.referral_fee != null ? formatCurrency(r.referral_fee) : '—'}
                </Mono>
            ),
        },
        {
            key: 'fba_fulfillment_fee',
            header: t('spApi.columns.fbaFee'),
            sortable: true,
            render: (r) => (
                <Mono className="text-text-secondary">
                    {r.fba_fulfillment_fee != null ? formatCurrency(r.fba_fulfillment_fee) : '—'}
                </Mono>
            ),
        },
        {
            key: 'total_fees',
            header: t('spApi.columns.totalFees'),
            sortable: true,
            render: (r) => (
                <Mono className="text-text-secondary">
                    {r.total_fees != null ? formatCurrency(r.total_fees) : '—'}
                </Mono>
            ),
        },
        {
            key: 'net_revenue',
            header: t('spApi.columns.netRev'),
            sortable: true,
            render: (r) =>
                r.net_revenue != null ? (
                    <Mono
                        className={r.net_revenue >= 0 ? 'text-success' : 'text-error'}
                    >
                        {formatCurrency(r.net_revenue)}
                    </Mono>
                ) : (
                    <Mono>—</Mono>
                ),
        },
        {
            key: 'margin_pct',
            header: t('spApi.columns.margin'),
            sortable: true,
            render: (r) => {
                if (r.margin_pct == null) return <Mono>—</Mono>
                const colorClass =
                    r.margin_pct >= 30
                        ? 'text-success'
                        : r.margin_pct >= 15
                            ? 'text-warning'
                            : 'text-error'
                return (
                    <Mono className={cn('font-semibold', colorClass)}>
                        {r.margin_pct.toFixed(1)}%
                    </Mono>
                )
            },
        },
        {
            key: 'source',
            header: t('spApi.columns.source'),
            sortable: false,
            render: (r) => {
                const colorClass =
                    r.source === 'sp-api'
                        ? 'text-success'
                        : r.source === 'partial'
                            ? 'text-warning'
                            : 'text-text-muted'
                return <Caption className={colorClass}>{r.source}</Caption>
            },
        },
    ], [t])

    // ── Error state ──────────────────────────────────────────────────────────
    if (error) {
        return (
            <Stack gap="sm" className="border border-error bg-surface-tertiary px-4 py-3">
                <Row gap="sm">
                    <IconAlertTriangle size={16} className="text-error shrink-0" />
                    <Small className="text-error">
                        {error.message || t('spApi.errorFallback')}
                    </Small>
                </Row>
            </Stack>
        )
    }

    // ── Empty / loading state ────────────────────────────────────────────────
    if (!isPending && rows.length === 0) {
        return (
            <Stack gap="md" className="items-center py-12">
                <IconDatabaseOff size={32} className="text-text-muted" />
                <Subheading className="text-text-muted">{t('spApi.emptyTitle')}</Subheading>
                <Body className="text-text-muted text-center max-w-sm">
                    {t('spApi.emptyBody')}
                </Body>
            </Stack>
        )
    }

    if (isPending && rows.length === 0) {
        return (
            <Stack gap="md" className="items-center py-12">
                <Body className="text-text-muted">{t('spApi.lookupCtaLoading')}</Body>
            </Stack>
        )
    }

    // ── Results ──────────────────────────────────────────────────────────────
    return (
        <Stack gap="sm">
            <Row className="justify-between">
                <Caption className="text-text-muted">
                    {t('spApi.resultsCount', {
                        count: rows.length,
                        marketplace,
                    })}
                </Caption>
                <Button variant="ghost" size="sm" icon={<IconTableExport size={14} />} onClick={onExport}>
                    {t('spApi.exportCsv')}
                </Button>
            </Row>

            <DataTable
                columns={columns}
                data={rows}
                keyExtractor={(r) => r.asin}
            />
        </Stack>
    )
}
