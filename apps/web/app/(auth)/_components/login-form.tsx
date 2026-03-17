'use client'

import { useTranslations } from 'next-intl'
import { loginAction } from '../actions'
import { LoginSchema } from '@/schemas/auth'
import { useFormAction } from '@/hooks/use-form-action'
import { Button, Stack, Alert } from '@puckora/ui'
import { FormField } from '@/components/form/form-field'
import { FormInput } from '@/components/form/form-input'

export function LoginForm() {
    const t = useTranslations('auth.login')
    const { form, onSubmit, serverError, isPending } = useFormAction(LoginSchema, loginAction)
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
                        autoComplete="current-password"
                        error={!!errors.password}
                        {...register('password')}
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
