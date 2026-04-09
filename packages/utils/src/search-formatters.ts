import type { ProductFinancial } from '@puckora/types'
import { coerceNumber } from './number'

export function formatMoney(value: number | string | null | undefined): string {
    const numericValue = coerceNumber(value)
    if (numericValue == null) return '—'
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericValue)
}

export function formatCompactMoney(value: number | string | null | undefined): string {
    const numericValue = coerceNumber(value)
    if (numericValue == null) return '—'
    return `$${Math.round(numericValue).toLocaleString()}`
}

export function formatCount(value: number | string | null | undefined): string {
    const numericValue = coerceNumber(value)
    if (numericValue == null) return '—'
    return Math.round(numericValue).toLocaleString()
}

export function formatRating(value: number | string | null | undefined): string {
    const numericValue = coerceNumber(value)
    if (numericValue == null) return '—'
    return `${numericValue.toFixed(1)}`
}

/**
 * Formats a fractional value (0–1 scale) as a percentage, e.g. 0.253 → "25%".
 * Use for margin/rate fields stored as fractions.
 */
export function formatPercent(value: number | string | null | undefined): string {
    const numericValue = coerceNumber(value)
    if (numericValue == null) return '—'
    return `${Math.round(numericValue * 100)}%`
}

/**
 * Formats a value already on the 0–100 percentage scale, e.g. 25.3 → "25.3%".
 * Use for `amazon_fee_pct`, `new_listing_pct`, and other DB-computed percent columns.
 */
export function formatScaledPercent(value: number | string | null | undefined): string {
    const numericValue = coerceNumber(value)
    if (numericValue == null) return '—'
    return `${numericValue.toFixed(1)}%`
}

/**
 * Formats a BSR / category rank value as "#1,234", e.g. 1234 → "#1,234".
 */
export function formatRank(value: number | string | null | undefined): string {
    const numericValue = coerceNumber(value)
    if (numericValue == null) return '—'
    return `#${Math.round(numericValue).toLocaleString()}`
}

export function formatWeight(value: number | string | null | undefined): string {
    const numericValue = coerceNumber(value)
    if (numericValue == null) return '—'
    return `${numericValue.toFixed(2)} kg`
}

export function formatDims(product: ProductFinancial): string {
    const length = coerceNumber(product.pkg_length_cm)
    const width = coerceNumber(product.pkg_width_cm)
    const height = coerceNumber(product.pkg_height_cm)
    if (length == null && width == null && height == null) return '—'
    return `${length ?? '?'}×${width ?? '?'}×${height ?? '?'} cm`
}

export function formatMargin(product: ProductFinancial): string {
    const price = coerceNumber(product.price)
    const netPerUnit = coerceNumber(product.net_per_unit)
    if (price == null || netPerUnit == null || price <= 0) return '—'
    return `${Math.round((netPerUnit / price) * 100)}%`
}

export function getAveragePrice(products: ProductFinancial[]): number | null {
    const priced = products
        .map((product) => coerceNumber(product.price))
        .filter((value): value is number => value != null)

    if (priced.length === 0) return null

    return priced.reduce((sum, value) => sum + value, 0) / priced.length
}

export function getMedianPrice(products: ProductFinancial[]): number | null {
    const priced = products
        .map((product) => coerceNumber(product.price))
        .filter((value): value is number => value != null)
        .sort((a, b) => a - b)

    if (priced.length === 0) return null

    const mid = Math.floor(priced.length / 2)
    return priced.length % 2 === 0 ? (priced[mid - 1] + priced[mid]) / 2 : priced[mid]
}

/** Formats a fee/deduction as "−$X.XX" with a proper minus sign. Returns "—" if null or zero. */
export function formatDeductMoney(value: number | null | undefined): string {
    if (value == null || value === 0) return '—'
    return `−${formatMoney(value)}`
}