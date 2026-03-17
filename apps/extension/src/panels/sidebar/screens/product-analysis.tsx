/**
 * ProductAnalysis — shows FBA financial data for the current Amazon product page.
 *
 * Reads from the analysis store which is populated by the content script
 * after parsing the page on mount.
 */
import { useTranslation } from 'react-i18next'
import { Stack, Body, Caption, Alert } from '@puckora/ui'
import { useAnalysisStore } from '@/stores/analysis.store'
import { FinancialCard } from '../components/financial-card'
import { SearchResults } from './search-results'
import { formatCurrency } from '@puckora/utils'

export function ProductAnalysis() {
    const { status, result, error } = useAnalysisStore()
    const { t } = useTranslation()

    if (status === 'loading') {
        return (
            <Stack gap="3">
                <Body>{t('analysis.loading')}</Body>
                {/* Skeleton cards */}
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="h-[72px] rounded-md bg-card opacity-50 animate-pulse"
                    />
                ))}
            </Stack>
        )
    }

    if (status === 'error' || error) {
        return (
            <Alert variant="error">
                {error ?? t('analysis.error')}
            </Alert>
        )
    }

    if (!result) {
        return (
            <Stack gap="2">
                <Body>
                    {t('analysis.empty')}
                </Body>
            </Stack>
        )
    }

    const marginSentiment =
        result.estimated_margin_pct == null
            ? 'neutral'
            : result.estimated_margin_pct >= 30
                ? 'positive'
                : result.estimated_margin_pct >= 10
                    ? 'neutral'
                    : 'negative'

    return (
        <Stack gap="4">
            {/* ASIN + keyword */}
            {result.asin && (
                <Caption className="font-mono">
                    {result.asin} · {result.marketplace ?? 'US'}
                </Caption>
            )}

            {/* Financial metrics grid */}
            <div className="grid grid-cols-2 gap-2">
                <FinancialCard
                    label={t('analysis.fbaFee')}
                    value={result.fba_fee != null ? formatCurrency(result.fba_fee / 100) : null}
                    hint={t('analysis.fbaFeeHint')}
                />
                <FinancialCard
                    label={t('analysis.referralFee')}
                    value={result.referral_fee_pct != null ? `${result.referral_fee_pct}` : null}
                    unit="%"
                    hint={t('analysis.referralFeeHint')}
                />
                <FinancialCard
                    label={t('analysis.estMargin')}
                    value={result.estimated_margin_pct != null ? `${result.estimated_margin_pct}` : null}
                    unit="%"
                    sentiment={marginSentiment}
                />
                <FinancialCard
                    label={t('analysis.bsr')}
                    value={result.bsr != null ? `#${result.bsr.toLocaleString()}` : null}
                    hint={t('analysis.bsrHint')}
                />
            </div>

            {/* Listings from the page */}
            {result.listings.length > 0 && (
                <Stack gap="2">
                    <Caption className="font-medium">
                        {t('analysis.listingsCount', { count: result.listings.length })}
                    </Caption>
                    <SearchResults listings={result.listings} />
                </Stack>
            )}
        </Stack>
    )
}
