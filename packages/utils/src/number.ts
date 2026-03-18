export function coerceNumber(value: number | string | null | undefined): number | null {
    if (value == null) return null
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null
    }

    const normalized = Number(value)
    return Number.isFinite(normalized) ? normalized : null
}