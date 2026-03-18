import type { ProductFinancial } from '@puckora/types'
import { coerceNumber } from './number'

export function formatMoney(value: number | string | null | undefined): string {
    const numericValue = coerceNumber(value)
    if (numericValue == null) return '—'
    return `$${numericValue.toFixed(2)}`
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
    return `${numericValue.toFixed(1)} ★`
}

export function formatPercent(value: number | string | null | undefined): string {
    const numericValue = coerceNumber(value)
    if (numericValue == null) return '—'
    return `${Math.round(numericValue * 100)}%`
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