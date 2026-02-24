import React from 'react'
import { MARKETPLACES } from '@repo/types'
import { Button } from '@/components/building-blocks/Button'
import { Stack, Row } from '@/components/building-blocks/layout'
import { Small } from '@/components/building-blocks/typography'
import { FormField, FormSelect, FormInput } from '@/components/form'
import { useT } from '@/hooks/useT'

export interface SpApiInputPanelProps {
    asinInput: string
    marketplace: string
    price: string
    validCount: number
    isPending: boolean
    onAsinChange: (v: string) => void
    onMarketplaceChange: (v: string) => void
    onPriceChange: (v: string) => void
    onLookup: () => void
}

const MARKETPLACE_OPTIONS = MARKETPLACES.map((m) => ({ label: m, value: m }))

export function SpApiInputPanel({
    asinInput,
    marketplace,
    price,
    validCount,
    isPending,
    onAsinChange,
    onMarketplaceChange,
    onPriceChange,
    onLookup,
}: SpApiInputPanelProps) {
    const { t } = useT('research')

    return (
        <div className="border border-border bg-surface-secondary px-5 py-4">
            <Stack gap="md">
                <Row gap="md" wrap align="end">
                    {/* ASIN input */}
                    <div className="flex-1 min-w-[280px]">
                        <FormField
                            label={`${t('spApi.asinsLabel')} — ${t('spApi.asinsHint')}`}
                        >
                            <textarea
                                rows={3}
                                value={asinInput}
                                onChange={(e) => onAsinChange(e.target.value)}
                                placeholder={t('spApi.asinsPlaceholder')}
                                className="w-full border border-border bg-surface-tertiary px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary resize-y transition-colors"
                            />
                        </FormField>
                    </div>

                    {/* Marketplace */}
                    <div className="w-32">
                        <FormField label={t('spApi.marketplace')}>
                            <FormSelect
                                value={marketplace}
                                onChange={(e) => onMarketplaceChange(e.target.value)}
                                options={MARKETPLACE_OPTIONS}
                            />
                        </FormField>
                    </div>

                    {/* Price context */}
                    <div className="w-40">
                        <FormField
                            label={t('spApi.priceContext')}
                            hint={t('spApi.priceContextHint')}
                        >
                            <FormInput
                                type="number"
                                min={0}
                                step={0.01}
                                value={price}
                                onChange={(e) => onPriceChange(e.target.value)}
                                placeholder="29.99"
                            />
                        </FormField>
                    </div>

                    {/* Lookup CTA */}
                    <Button
                        variant="primary"
                        loading={isPending}
                        disabled={validCount === 0 || isPending}
                        onClick={onLookup}
                    >
                        {isPending
                            ? t('spApi.lookupCtaLoading')
                            : validCount > 0
                                ? t('spApi.lookupCtaCount', { count: validCount })
                                : t('spApi.lookupCta')}
                    </Button>
                </Row>

                {/* Inline validation */}
                {asinInput.trim() && validCount === 0 && (
                    <Small className="text-error">{t('spApi.invalidAsins')}</Small>
                )}
            </Stack>
        </div>
    )
}
