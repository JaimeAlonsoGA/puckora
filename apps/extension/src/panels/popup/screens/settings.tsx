/**
 * Settings view — user preferences accessible from the popup.
 */
import { useTranslation } from 'react-i18next'
import { Stack, Surface, Heading, Body, Label } from '@puckora/ui'

const MARKETPLACES = [
    { code: 'US', label: 'United States (amazon.com)' },
    { code: 'GB', label: 'United Kingdom (amazon.co.uk)' },
    { code: 'DE', label: 'Germany (amazon.de)' },
    { code: 'FR', label: 'France (amazon.fr)' },
    { code: 'CA', label: 'Canada (amazon.ca)' },
    { code: 'JP', label: 'Japan (amazon.co.jp)' },
]

export function Settings() {
    const { t } = useTranslation()
    // TODO: persist preference via chrome.storage — using local state for now
    return (
        <Surface
            variant="base"
            className="w-80 min-h-[200px]"
        >
            <Stack gap="4">
                <Heading as="h4">{t('settings.title')}</Heading>

                <Stack gap="2">
                    <Label htmlFor="preferred-marketplace">{t('settings.preferredMarketplace')}</Label>
                    <select
                        id="preferred-marketplace"
                        className="w-full py-2 px-3 rounded-md border border-border bg-background text-foreground text-sm"
                    >
                        {MARKETPLACES.map((m) => (
                            <option key={m.code} value={m.code}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    <Body size="sm">
                        {t('settings.marketplaceHint')}
                    </Body>
                </Stack>
            </Stack>
        </Surface>
    )
}
