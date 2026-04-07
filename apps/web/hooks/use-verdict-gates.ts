'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { ProductFinancial } from '@puckora/types'
import { formatMoney } from '@puckora/utils'
import type { SearchOverviewStats } from '@puckora/utils'
import {
    SEARCH_OVERVIEW_PARAM,
    SEARCH_OVERVIEW_QUICK_CHECK_BANDS,
    type SearchOverviewParamId,
    type SearchOverviewQuickCheckThresholds,
} from '@/constants/search'

export const OVERVIEW_QUICK_CHECK_STATUS = {
    PASS: 'pass',
    WARN: 'warn',
    FAIL: 'fail',
} as const

export type OverviewQuickCheckStatus = (typeof OVERVIEW_QUICK_CHECK_STATUS)[keyof typeof OVERVIEW_QUICK_CHECK_STATUS]

/** Text-colour classes for always-dark-surface status signals (anchored to dark-panel-bg). */
export const QUICK_CHECK_STATUS_TEXT_CLASS: Record<OverviewQuickCheckStatus, string> = {
    [OVERVIEW_QUICK_CHECK_STATUS.PASS]: 'text-dark-panel-pass',
    [OVERVIEW_QUICK_CHECK_STATUS.WARN]: 'text-dark-panel-warn',
    [OVERVIEW_QUICK_CHECK_STATUS.FAIL]: 'text-dark-panel-fail',
}

export type OverviewQuickCheck = {
    id: SearchOverviewParamId
    summary: string
    status: OverviewQuickCheckStatus
}

function formatThreshold(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function hasValue(value: number | null | undefined): value is number {
    return value != null && Number.isFinite(value)
}

function getSampleCount(products: ProductFinancial[] | undefined, activeChecks: OverviewQuickCheck[]): number {
    if (!products || products.length === 0) return 0
    if (activeChecks.length === 0) return products.length

    return products.filter((product) => activeChecks.every((check) => {
        switch (check.id) {
            case SEARCH_OVERVIEW_PARAM.WEIGHT:
                return hasValue(product.pkg_weight_kg)
            case SEARCH_OVERVIEW_PARAM.REVIEWS:
                return hasValue(product.review_count)
            case SEARCH_OVERVIEW_PARAM.AMAZON_CUT:
                return hasValue(product.amazon_fee_pct)
            case SEARCH_OVERVIEW_PARAM.PRICE:
                return hasValue(product.price)
            default:
                return false
        }
    })).length
}

export function useOverviewQuickChecks(
    products: ProductFinancial[],
    stats: SearchOverviewStats,
    averagePrice: number | null,
    activeParamIds: SearchOverviewParamId[],
    thresholds: SearchOverviewQuickCheckThresholds,
): { checks: OverviewQuickCheck[]; sampledCount: number } {
    const t = useTranslations('search')

    return useMemo(() => {
        const checks: OverviewQuickCheck[] = []

        for (const paramId of activeParamIds) {
            if (paramId === SEARCH_OVERVIEW_PARAM.WEIGHT) {
                const averageWeightKg = stats.avg_pkg_weight_kg
                if (!hasValue(averageWeightKg) || averageWeightKg <= 0) continue

                const warnWeightThreshold = thresholds.maxAvgWeightKg * SEARCH_OVERVIEW_QUICK_CHECK_BANDS.WEIGHT_WARN_MULTIPLIER
                const weightStatus = averageWeightKg <= thresholds.maxAvgWeightKg
                    ? OVERVIEW_QUICK_CHECK_STATUS.PASS
                    : averageWeightKg <= warnWeightThreshold
                        ? OVERVIEW_QUICK_CHECK_STATUS.WARN
                        : OVERVIEW_QUICK_CHECK_STATUS.FAIL

                const weightSummary = weightStatus === OVERVIEW_QUICK_CHECK_STATUS.PASS
                    ? t('quickChecks.weight.pass', { threshold: formatThreshold(thresholds.maxAvgWeightKg) })
                    : weightStatus === OVERVIEW_QUICK_CHECK_STATUS.WARN
                        ? t('quickChecks.weight.warn', { threshold: formatThreshold(thresholds.maxAvgWeightKg) })
                        : t('quickChecks.weight.fail', { threshold: formatThreshold(thresholds.maxAvgWeightKg) })

                checks.push({ id: SEARCH_OVERVIEW_PARAM.WEIGHT, summary: weightSummary, status: weightStatus })
                continue
            }

            if (paramId === SEARCH_OVERVIEW_PARAM.REVIEWS) {
                const reviewCount = stats.avg_review_count
                if (!hasValue(reviewCount) || reviewCount <= 0) continue

                const passReviewThreshold = thresholds.reviewWallCount * SEARCH_OVERVIEW_QUICK_CHECK_BANDS.REVIEW_PASS_RATIO
                const reviewStatus = reviewCount < passReviewThreshold
                    ? OVERVIEW_QUICK_CHECK_STATUS.PASS
                    : reviewCount < thresholds.reviewWallCount
                        ? OVERVIEW_QUICK_CHECK_STATUS.WARN
                        : OVERVIEW_QUICK_CHECK_STATUS.FAIL

                const reviewSummary = reviewStatus === OVERVIEW_QUICK_CHECK_STATUS.PASS
                    ? t('quickChecks.reviews.pass')
                    : reviewStatus === OVERVIEW_QUICK_CHECK_STATUS.WARN
                        ? t('quickChecks.reviews.warn')
                        : t('quickChecks.reviews.fail')

                checks.push({ id: SEARCH_OVERVIEW_PARAM.REVIEWS, summary: reviewSummary, status: reviewStatus })
                continue
            }

            if (paramId === SEARCH_OVERVIEW_PARAM.AMAZON_CUT) {
                const amazonCutPct = Math.round(stats.avg_amazon_fee_pct)
                if (!hasValue(amazonCutPct) || amazonCutPct <= 0) continue

                const passAmazonCutThreshold = thresholds.maxAmazonCutPct * SEARCH_OVERVIEW_QUICK_CHECK_BANDS.AMAZON_CUT_PASS_RATIO
                const amazonCutStatus = amazonCutPct < passAmazonCutThreshold
                    ? OVERVIEW_QUICK_CHECK_STATUS.PASS
                    : amazonCutPct < thresholds.maxAmazonCutPct
                        ? OVERVIEW_QUICK_CHECK_STATUS.WARN
                        : OVERVIEW_QUICK_CHECK_STATUS.FAIL

                checks.push({
                    id: SEARCH_OVERVIEW_PARAM.AMAZON_CUT,
                    summary: t('quickChecks.amazonCut.value', { pct: amazonCutPct }),
                    status: amazonCutStatus,
                })
                continue
            }

            if (paramId === SEARCH_OVERVIEW_PARAM.PRICE) {
                if (!hasValue(averagePrice) || averagePrice <= 0) continue

                const warnPriceThreshold = thresholds.maxPriceUsd * SEARCH_OVERVIEW_QUICK_CHECK_BANDS.PRICE_WARN_MULTIPLIER
                const priceStatus = averagePrice <= thresholds.maxPriceUsd
                    ? OVERVIEW_QUICK_CHECK_STATUS.PASS
                    : averagePrice <= warnPriceThreshold
                        ? OVERVIEW_QUICK_CHECK_STATUS.WARN
                        : OVERVIEW_QUICK_CHECK_STATUS.FAIL

                const priceSummary = priceStatus === OVERVIEW_QUICK_CHECK_STATUS.PASS
                    ? t('quickChecks.price.pass', { threshold: formatMoney(thresholds.maxPriceUsd) })
                    : priceStatus === OVERVIEW_QUICK_CHECK_STATUS.WARN
                        ? t('quickChecks.price.warn', { threshold: formatMoney(thresholds.maxPriceUsd) })
                        : t('quickChecks.price.fail', { threshold: formatMoney(thresholds.maxPriceUsd) })

                checks.push({
                    id: SEARCH_OVERVIEW_PARAM.PRICE,
                    summary: priceSummary,
                    status: priceStatus,
                })
            }
        }

        return {
            checks,
            sampledCount: getSampleCount(products, checks),
        }
    }, [activeParamIds, averagePrice, products, stats, t, thresholds])
}
