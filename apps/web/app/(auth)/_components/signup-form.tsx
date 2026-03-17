'use client'

import { useTranslations } from 'next-intl'
import { signupAction } from '../actions'
import { SignupSchema } from '@/schemas/auth'
import { useFormAction } from '@/hooks/use-form-action'
import { Button, Stack, Alert } from '@puckora/ui'
import { FormField } from '@/components/form/form-field'
import { FormInput } from '@/components/form/form-input'

export function SignupForm() {
    const t = useTranslations('auth.signup')
    const { form, onSubmit, serverError, isPending } = useFormAction(SignupSchema, signupAction)
    const { register, formState: { errors } } = form

    return (
        <form onSubmit={onSubmit}>
            <Stack gap="4">
                <FormField label={t('email')} htmlFor="email" error={errors.email?.message}>
                    <FormInput
                        id="email"
                        type="email"
                        autoComplete="email"
                        error={!!errors.email}
                        {...register('email')}
                    />
                </FormField>

                <FormField label={t('password')} htmlFor="password" error={errors.password?.message}>
                    <FormInput
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        error={!!errors.password}
                        {...register('password')}
                    />
                </FormField>

                <FormField label={t('confirmPassword')} htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
                    <FormInput
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        error={!!errors.confirmPassword}
                        {...register('confirmPassword')}
                    />
                </FormField>

                {serverError && (
                    <Alert variant="error">{serverError}</Alert>
                )}

                <Button type="submit" variant="primary" fullWidth loading={isPending}>
                    {t('submit')}
                </Button>
            </Stack>
        </form>
    )
}
