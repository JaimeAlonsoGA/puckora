'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { User } from '@puckora/types'
import { SettingsUpdateSchema } from '@puckora/types/schemas'
import { useFormAction } from '@/hooks/use-form-action'
import { updateProfileAction } from '@/app/(app)/actions'
import { useInvalidateUser } from '@/queries/users'
import { Surface, Button, Alert } from '@/components/building-blocks'
import { Subheading, Body } from '@/components/building-blocks/typography'
import { FormField } from '@/components/form/form-field'
import { FormInput } from '@/components/form/form-input'

type ProfileFormProps = {
    profile: User
}

export function ProfileForm({ profile }: ProfileFormProps) {
    const t = useTranslations('settings.profile')
    const tc = useTranslations('common')
    const router = useRouter()
    const invalidateUser = useInvalidateUser()

    const { form, onSubmit, serverError, isPending } = useFormAction(
        SettingsUpdateSchema,
        updateProfileAction,
        {
            defaultValues: { display_name: profile.display_name ?? '' },
            onSuccess: () => {
                // Invalidate cached user so useUserPreferences() refetches
                invalidateUser()
                // Re-run Server Components so they receive the updated profile
                router.refresh()
            },
        },
    )

    const { register, formState: { errors, isDirty } } = form

    return (
        <Surface variant="card" padding="lg" border="default">
            <div className="mb-[var(--space-5)] flex flex-col gap-[var(--space-1)]">
                <Subheading>{t('title')}</Subheading>
                <Body size="sm">{t('description')}</Body>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-[var(--space-4)]">
                <FormField
                    label={t('fullName')}
                    htmlFor="display_name"
                    error={errors.display_name?.message}
                >
                    <FormInput
                        id="display_name"
                        placeholder={t('fullNamePlaceholder')}
                        autoComplete="name"
                        error={!!errors.display_name}
                        {...register('display_name')}
                    />
                </FormField>

                {serverError && <Alert variant="error">{serverError}</Alert>}

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        loading={isPending}
                        disabled={!isDirty}
                    >
                        {tc('save')}
                    </Button>
                </div>
            </form>
        </Surface>
    )
}
