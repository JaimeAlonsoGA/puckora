const dateFormatters = new Map<string, Intl.DateTimeFormat>()

export function formatDate(
    date: string | Date,
    locale: string = 'en-US',
    options?: Intl.DateTimeFormatOptions,
): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const key = `${locale}-${JSON.stringify(options ?? {})}`
    let formatter = dateFormatters.get(key)
    if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options,
        })
        dateFormatters.set(key, formatter)
    }
    return formatter.format(d)
}
