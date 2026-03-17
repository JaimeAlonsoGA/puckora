/**
 * SupplierSearch — cross-platform keyword search, Amazon ↔ Alibaba.
 *
 * The user types a keyword and we trigger simultaneous scrape jobs on
 * both platforms, then display results side by side.
 *
 * TODO: Wire up to TanStack Query mutations once the backend supports
 *       on-demand Alibaba scrape jobs.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Stack, Body, Caption, Button, Alert } from '@puckora/ui'
import { buildAlibabaSearchUrl, buildAmazonSearchUrl } from '@/constants/urls'

export function SupplierSearch() {
    const [keyword, setKeyword] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const { t } = useTranslation()

    function handleSearch() {
        if (!keyword.trim()) return
        setSubmitted(true)
    }

    return (
        <Stack gap="4">
            <Stack gap="1">
                <Body className="font-medium">{t('suppliers.title')}</Body>
                <Caption>
                    {t('suppliers.description')}
                </Caption>
            </Stack>

            {/* Search input */}
            <Stack gap="2">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value)
                            setSubmitted(false)
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder={t('suppliers.placeholder')}
                        className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm outline-none focus:border-primary"
                    />
                    <Button variant="primary" size="sm" onClick={handleSearch}>
                        {t('suppliers.search')}
                    </Button>
                </div>
            </Stack>

            {submitted && keyword.trim() && (
                <Stack gap="3">
                    <Alert variant="info">
                        {t('suppliers.openingSearch', { keyword })}
                    </Alert>

                    <Stack direction="row" gap="2">
                        <Button
                            variant="secondary"
                            size="sm"
                            style={{ flex: 1 }}
                            onClick={() =>
                                window.open(buildAmazonSearchUrl(keyword, 'US'), '_blank')
                            }
                        >
                            🛒 {t('suppliers.openAmazon')}
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            style={{ flex: 1 }}
                            onClick={() =>
                                window.open(buildAlibabaSearchUrl(keyword), '_blank')
                            }
                        >
                            🏭 {t('suppliers.openAlibaba')}
                        </Button>
                    </Stack>

                    <Caption>
                        {t('suppliers.note')}
                    </Caption>
                </Stack>
            )}
        </Stack>
    )
}
