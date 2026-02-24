/**
 * Format a date string or Date object as a locale date string.
 */
export function formatDate(date: string | Date, locale = 'en-US'): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(d)
}

/**
 * Format a date string as a relative time string (e.g. "3 days ago").
 */
export function formatRelativeTime(date: string | Date, locale = 'en-US'): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

    if (diffDay > 0) return rtf.format(-diffDay, 'day')
    if (diffHour > 0) return rtf.format(-diffHour, 'hour')
    if (diffMin > 0) return rtf.format(-diffMin, 'minute')
    return rtf.format(-diffSec, 'second')
}

/**
 * Format a date as ISO date string (YYYY-MM-DD).
 */
export function toISODateString(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString().split('T')[0] ?? ''
}
