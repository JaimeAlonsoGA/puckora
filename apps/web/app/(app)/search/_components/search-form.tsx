'use client'

import { useTranslations } from 'next-intl'
import { IconSearch } from '@tabler/icons-react'
import { Surface, Stack, Alert, Button } from '@puckora/ui'
import { FormField, FormInput } from '@/components/form'
import { useFormAction } from '@/hooks/use-form-action'
import { createScrapeJobAction } from '@/app/(app)/actions'
import { AmazonSearchInputSchema } from '@/schemas/scrape'

/**
 * SearchForm
 *
 * Dumb form component — owns no routing logic.
 * Submits via createScrapeJobAction which redirects to /search?job=<id>.
 */
export function SearchForm() {
    const t = useTranslations('search')

    const { form, onSubmit, serverError, isPending } = useFormAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        AmazonSearchInputSchema as any,
        createScrapeJobAction,
    )

    return (
        <Surface variant="card" padding="lg" border="default">
            <form onSubmit={onSubmit}>
                <Stack gap="4">
                    {serverError && <Alert variant="error">{serverError}</Alert>}

                    <FormField
                        label={t('shellSearchTerm')}
                        error={form.formState.errors.keyword?.message}
                    >
                        <FormInput
                            {...form.register('keyword')}
                            placeholder={t('shellSearchPlaceholder')}
                            type="search"
                            autoFocus
                        />
                    </FormField>

                    <Button type="submit" variant="primary" loading={isPending} fullWidth>
                        <IconSearch size={16} aria-hidden="true" />
                        {t('search')}
                    </Button>
                </Stack>
            </form>
        </Surface>
    )
}
