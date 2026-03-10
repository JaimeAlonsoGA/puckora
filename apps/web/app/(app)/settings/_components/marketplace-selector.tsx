'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useInvalidateUser } from '@/queries/users'
import { useState } from 'react'
import { MARKETPLACES } from '@puckora/types'
import { AppRoute } from '@/constants/routes'
import { Surface, Alert } from '@/components/building-blocks'
import { FormField } from '@/components/form/form-field'
import { FormSelect } from '@/components/form/form-select'
import { Subheading, Body } from '@/components/building-blocks/typography'

type MarketplaceSelectorProps = {
    currentMarketplace: string
}

export function MarketplaceSelector({ currentMarketplace }: MarketplaceSelectorProps) {
    const t = useTranslations('settings.marketplace')
    const router = useRouter()
    const invalidateUser = useInvalidateUser()
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const options = MARKETPLACES.map((m) => ({
        value: m.id,
        label: `${m.flag} ${m.name} (${m.domain})`,
    }))

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSaving(true)
        setError(null)
        try {
            const res = await fetch(AppRoute.apiSettings, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ marketplace: e.target.value }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error((body as { error?: string }).error ?? 'Failed to save')
            }
            // Invalidate client-side cache so useMarketplace() refetches
            await invalidateUser()
            // Refresh Server Components so they render with the new marketplace
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Surface variant="card" padding="lg" border="default">
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

            {error && <Alert variant="error" className="mt-[var(--space-3)]">{error}</Alert>}
        </Surface>
    )
}
