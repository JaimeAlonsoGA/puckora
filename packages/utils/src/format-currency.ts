const currencyFormatters = new Map<string, Intl.NumberFormat>()

export function formatCurrency(
    amount: number,
    currency: string = 'USD',
    locale: string = 'en-US',
): string {
    const key = `${locale}-${currency}`
    let formatter = currencyFormatters.get(key)
    if (!formatter) {
        formatter = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
        currencyFormatters.set(key, formatter)
    }
    return formatter.format(amount)
}
