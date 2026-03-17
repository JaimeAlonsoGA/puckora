/**
 * Alibaba search page DOM parsers.
 *
 * Extracts supplier listings from alibaba.com/trade/search results.
 */

export interface AlibabaListing {
    /** Alibaba product ID. */
    product_id: string
    title: string
    /** Min price in USD (approximate — Alibaba shows price ranges). */
    price_min: number | null
    /** Max price in USD. */
    price_max: number | null
    /** Min order quantity. */
    moq: number | null
    supplier_name: string
    supplier_country: string | null
    product_url: string
}

function parsePrice(text: string): number | null {
    const m = text.match(/[\d,]+(?:\.\d+)?/)
    if (!m) return null
    const v = parseFloat(m[0].replace(/,/g, ''))
    return isFinite(v) && v > 0 ? v : null
}

function parseMoq(text: string): number | null {
    const m = text.match(/([\d,]+)\s+(?:pieces?|units?|sets?|pcs?)/i)
    if (!m) return null
    const v = parseInt(m[1].replace(/,/g, ''), 10)
    return isFinite(v) ? v : null
}

/** Parse listings from the Alibaba search result page. */
export function parseAlibabaListings(): AlibabaListing[] {
    const listings: AlibabaListing[] = []
    const seen = new Set<string>()

    // Alibaba product cards use .organic-list-offer or .J-offer-wrapper
    const cards = document.querySelectorAll(
        '.organic-list-offer, .J-offer-wrapper, [class*="offer-list-item"]',
    )

    cards.forEach((card) => {
        const linkEl = card.querySelector<HTMLAnchorElement>('a[href*="alibaba.com/product-detail"]')
        if (!linkEl) return

        const href = linkEl.href
        const idMatch = href.match(/product-detail[^/]*\/([^_]+)/)
        const product_id = idMatch?.[1] ?? href
        if (seen.has(product_id)) return
        seen.add(product_id)

        const title =
            card.querySelector('.elements-title-normal__content, .title-con')
                ?.textContent?.trim() ?? ''
        if (!title) return

        // Price range — Alibaba shows "$1.20 - $3.50"
        const priceText =
            card.querySelector('[class*="price"]')?.textContent?.trim() ?? ''
        const priceParts = priceText.split(/[-–]/)
        const price_min = parsePrice(priceParts[0] ?? '')
        const price_max = parsePrice(priceParts[1] ?? priceParts[0] ?? '')

        const moqText =
            card.querySelector('[class*="moq"], [class*="min-order"]')?.textContent ?? ''
        const moq = parseMoq(moqText)

        const supplier_name =
            card.querySelector('[class*="company-name"]')?.textContent?.trim() ?? ''

        const countryEl = card.querySelector('[class*="country"]')
        const supplier_country = countryEl?.textContent?.trim() ?? null

        listings.push({
            product_id,
            title,
            price_min,
            price_max,
            moq,
            supplier_name,
            supplier_country,
            product_url: href,
        })
    })

    return listings
}

/** Waits for Alibaba to render offer cards (lazy loaded). */
export function waitForAlibabaResults(): Promise<void> {
    return new Promise((resolve) => {
        if (document.querySelector('.organic-list-offer, .J-offer-wrapper')) {
            resolve()
            return
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector('.organic-list-offer, .J-offer-wrapper')) {
                observer.disconnect()
                resolve()
            }
        })
        observer.observe(document.body, { childList: true, subtree: true })
        setTimeout(() => {
            observer.disconnect()
            resolve()
        }, 15_000)
    })
}
