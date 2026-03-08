'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { MARKETPLACES } from '@puckora/types'
import { AppRoute } from '@/lib/routes'
import { FormField } from '@/components/form/form-field'
import { FormSelect } from '@/components/form/form-select'
import { Subheading, Body } from '@/components/building-blocks/typography'

type MarketplaceSelectorProps = {
    currentMarketplace: string
}

export function MarketplaceSelector({ currentMarketplace }: MarketplaceSelectorProps) {
    const t = useTranslations('settings.marketplace')
    const router = useRouter()
    const queryClient = useQueryClient()
    const [saving, setSaving] = useState(false)

    const options = MARKETPLACES.map((m) => ({
        value: m.id,
        label: `${m.flag} ${m.name} (${m.domain})`,
    }))

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSaving(true)
        try {
            const res = await fetch(AppRoute.apiSettings, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ marketplace: e.target.value }),
            })
            if (!res.ok) throw new Error('Failed to save')
            // Invalidate client-side cache so useMarketplace() refetches
            await queryClient.invalidateQueries({ queryKey: ['profile'] })
            // Refresh Server Components so they render with the new marketplace
            router.refresh()
        } catch {
            // TODO: toast notification
        } finally {
            setSaving(false)
        }
    }

    return (
        <section className="rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)] p-[var(--space-6)]">
            <div className="mb-[var(--space-5)] flex flex-col gap-[var(--space-1)]">
                <Subheading>{t('title')}</Subheading>
                <Body size="sm">{t('description')}</Body>
            </div>

            <FormField label={t('label')} htmlFor="marketplace">
                <FormSelect
                    id="marketplace"
                    options={options}
                    defaultValue={currentMarketplace}
                    onChange={handleChange}
                    disabled={saving}
                />
            </FormField>
        </section>
    )
}
