/**
 * Format a number as currency string.
 * @param value - numeric value
 * @param currency - ISO currency code (default USD)
 * @param locale - locale string (default en-US)
 */
export function formatCurrency(
    value: number,
    currency = 'USD',
    locale = 'en-US',
): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(value: number, locale = 'en-US'): string {
    return new Intl.NumberFormat(locale).format(value)
}

/**
 * Format a decimal as a percentage string, e.g. 0.235 → "23.5%"
 */
export function formatPercent(value: number, decimals = 1): string {
    return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format a percentage value (already in %), e.g. 23.5 → "23.5%"
 */
export function formatPercentValue(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`
}

/**
 * Compact number for display: 1,500 → "1.5K", 1,200,000 → "1.2M"
 */
export function formatCompact(value: number, locale = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value)
}

/**
 * Format weight to human-readable string.
 */
export function formatWeight(kg: number): string {
    if (kg < 1) return `${(kg * 1000).toFixed(0)}g`
    return `${kg.toFixed(2)}kg`
}
