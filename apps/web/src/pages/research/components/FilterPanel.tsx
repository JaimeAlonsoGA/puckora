import React from 'react'
import { useT } from '@/hooks/useT'
import { FormSlider } from '@/components/form/FormSlider'
import { FormSelect } from '@/components/form/FormSelect'
import { FormField } from '@/components/form/FormField'
import { Subheading } from '@/components/building-blocks/typography'
import type { AmazonSearchParams } from '@repo/zod-schemas'
import { MARKETPLACES } from '@repo/types'

export interface FilterPanelProps {
    filters: Partial<AmazonSearchParams>
    onChange: (filters: Partial<AmazonSearchParams>) => void
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
    const { t } = useT('research')

    const marketplaceOptions = MARKETPLACES.map(m => ({ label: m, value: m }))

    return (
        <div className="flex flex-col gap-4 p-4 bg-surface-secondary border border-border rounded">
            <Subheading>{t('filters.title')}</Subheading>
            <FormField label="Marketplace">
                <FormSelect
                    options={marketplaceOptions}
                    value={filters.marketplace ?? 'US'}
                    onChange={e => onChange({ ...filters, marketplace: e.target.value as AmazonSearchParams['marketplace'] })}
                />
            </FormField>
            <FormSlider
                label="Min Rating"
                min={1}
                max={5}
                step={0.5}
                value={filters.minRating ?? 1}
                onChange={v => onChange({ ...filters, minRating: v })}
                formatValue={v => `★ ${v}`}
            />
            <FormSlider
                label="Max Reviews"
                min={0}
                max={10000}
                step={100}
                value={filters.maxReviews ?? 10000}
                onChange={v => onChange({ ...filters, maxReviews: v })}
                formatValue={v => v.toLocaleString()}
            />
        </div>
    )
}
