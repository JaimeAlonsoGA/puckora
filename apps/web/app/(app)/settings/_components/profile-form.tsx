'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AppRoute } from '@/lib/routes'
import type { Profile } from '@puckora/types'
import { SettingsUpdateSchema, type SettingsUpdateInput } from '@puckora/types/schemas'
import { FormField } from '@/components/form/form-field'
import { FormInput } from '@/components/form/form-input'
import { Button } from '@/components/building-blocks'
import { Subheading, Body } from '@/components/building-blocks/typography'

type ProfileFormProps = {
    profile: Profile
}

export function ProfileForm({ profile }: ProfileFormProps) {
    const t = useTranslations('settings.profile')
    const tc = useTranslations('common')
    const router = useRouter()
    const [saving, setSaving] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors, isDirty },
    } = useForm<SettingsUpdateInput>({
        resolver: zodResolver(SettingsUpdateSchema),
        defaultValues: {
            full_name: profile.full_name ?? '',
        },
    })

    const onSubmit = async (data: SettingsUpdateInput) => {
        setSaving(true)
        try {
            const res = await fetch(AppRoute.apiSettings, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!res.ok) throw new Error('Failed to save')
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

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-4)]">
                <FormField
                    label={t('fullName')}
                    htmlFor="full_name"
                    error={errors.full_name?.message}
                >
                    <FormInput
                        id="full_name"
                        placeholder={t('fullNamePlaceholder')}
                        error={!!errors.full_name}
                        {...register('full_name')}
                    />
                </FormField>

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        loading={saving}
                        disabled={!isDirty}
                    >
                        {tc('save')}
                    </Button>
                </div>
            </form>
        </section>
    )
}
