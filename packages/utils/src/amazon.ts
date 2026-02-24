/**
 * Extract ASIN from an Amazon product URL or raw string.
 * Returns null if no valid ASIN is found.
 */
export function extractAsin(input: string): string | null {
    // Direct ASIN pattern (10 chars, uppercase alphanumeric)
    const directMatch = input.match(/^[A-Z0-9]{10}$/)
    if (directMatch) return directMatch[0] ?? null

    // Amazon URL patterns
    const urlPatterns = [
        /\/dp\/([A-Z0-9]{10})/,
        /\/gp\/product\/([A-Z0-9]{10})/,
        /\/product\/([A-Z0-9]{10})/,
        /asin=([A-Z0-9]{10})/,
        /\/([A-Z0-9]{10})(?:\/|\?|$)/,
    ]

    for (const pattern of urlPatterns) {
        const match = input.match(pattern)
        if (match?.[1]) return match[1]
    }

    return null
}

/**
 * Build an Amazon product URL from an ASIN and marketplace.
 */
export function buildAmazonUrl(asin: string, marketplace = 'US'): string {
    const domains: Record<string, string> = {
        US: 'amazon.com',
        UK: 'amazon.co.uk',
        DE: 'amazon.de',
        FR: 'amazon.fr',
        IT: 'amazon.it',
        ES: 'amazon.es',
        CA: 'amazon.ca',
        JP: 'amazon.co.jp',
    }
    const domain = domains[marketplace] ?? 'amazon.com'
    return `https://www.${domain}/dp/${asin}`
}

/**
 * Build an Amazon search URL.
 */
export function buildAmazonSearchUrl(query: string, marketplace = 'US'): string {
    const domains: Record<string, string> = {
        US: 'amazon.com',
        UK: 'amazon.co.uk',
        DE: 'amazon.de',
        FR: 'amazon.fr',
        IT: 'amazon.it',
        ES: 'amazon.es',
        CA: 'amazon.ca',
        JP: 'amazon.co.jp',
    }
    const domain = domains[marketplace] ?? 'amazon.com'
    return `https://www.${domain}/s?k=${encodeURIComponent(query)}`
}

/**
 * Check if a string is a valid ASIN format.
 */
export function isValidAsin(value: string): boolean {
    return /^[A-Z0-9]{10}$/.test(value)
}
