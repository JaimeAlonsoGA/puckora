const ASIN_REGEX = /^[A-Z0-9]{10}$/

/**
 * Extracts an ASIN from a string — either a bare ASIN or an Amazon URL.
 * Returns null if no valid ASIN is found.
 */
export function parseAsin(input: string): string | null {
    const trimmed = input.trim()

    // Direct ASIN
    if (ASIN_REGEX.test(trimmed)) {
        return trimmed
    }

    // Amazon URL — /dp/ASIN or /gp/product/ASIN
    try {
        const url = new URL(trimmed)
        const pathParts = url.pathname.split('/')
        const dpIndex = pathParts.indexOf('dp')
        if (dpIndex !== -1 && pathParts[dpIndex + 1]) {
            const candidate = pathParts[dpIndex + 1]
            if (ASIN_REGEX.test(candidate)) return candidate
        }
        const gpIndex = pathParts.indexOf('product')
        if (gpIndex !== -1 && pathParts[gpIndex + 1]) {
            const candidate = pathParts[gpIndex + 1]
            if (ASIN_REGEX.test(candidate)) return candidate
        }
    } catch {
        // Not a URL — that's fine
    }

    return null
}
