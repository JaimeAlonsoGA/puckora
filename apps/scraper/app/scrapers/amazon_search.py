"""
Amazon product search scraper using Playwright.
"""
from app.models.requests import AmazonSearchParams
from app.models.amazon import AmazonSearchResponse, ProductSearchResult
from app.core.browser import get_page
from app.utils.parsers import parse_price, parse_int

MARKETPLACE_DOMAINS: dict[str, str] = {
    "US": "www.amazon.com",
    "UK": "www.amazon.co.uk",
    "DE": "www.amazon.de",
    "FR": "www.amazon.fr",
    "CA": "www.amazon.ca",
    "JP": "www.amazon.co.jp",
    "AU": "www.amazon.com.au",
    "IN": "www.amazon.in",
    "MX": "www.amazon.com.mx",
}

# ── Brand selector candidates (tried in order) ────────────────────────────────
_BRAND_SELECTORS = [
    ".s-title-instructions-style + div span.a-size-base.a-color-secondary",
    "h2 ~ .a-row span.a-size-base-plus",
    ".a-row.a-size-base.a-color-secondary .a-size-base-plus",
    # Fallback: "by BrandName" text node inside the card
    ".a-row span.a-size-base.a-color-secondary",
]


async def _extract_brand(item) -> str | None:
    """Try multiple selectors to find the brand string for a search card."""
    for sel in _BRAND_SELECTORS:
        try:
            el = await item.query_selector(sel)
            if el:
                text = (await el.inner_text()).strip()
                # Strip common prefixes like "by " or "Visit the X Store"
                if text.lower().startswith("by "):
                    text = text[3:].strip()
                if text and len(text) < 80:
                    return text
        except Exception:
            continue
    return None


async def search(params: AmazonSearchParams) -> AmazonSearchResponse:
    domain = MARKETPLACE_DOMAINS.get(params.marketplace, "www.amazon.com")
    url = (
        f"https://{domain}/s?k={params.query.replace(' ', '+')}"
        f"&page={params.page}"
    )

    results: list[ProductSearchResult] = []

    async with get_page() as page:
        await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        items = await page.query_selector_all('[data-component-type="s-search-result"]')

        for item in items[:20]:
            try:
                asin = await item.get_attribute("data-asin") or ""
                if not asin:
                    continue

                title_el = await item.query_selector("h2 a span")
                title = (await title_el.inner_text()).strip() if title_el else ""

                brand = await _extract_brand(item)

                price_el = await item.query_selector(".a-price .a-offscreen")
                price_text = (await price_el.inner_text()) if price_el else None
                price = parse_price(price_text)

                rating_el = await item.query_selector(".a-icon-star-small .a-icon-alt")
                rating_text = await rating_el.inner_text() if rating_el else None
                rating = float(rating_text.split()[0]) if rating_text else None

                reviews_el = await item.query_selector('[aria-label*="ratings"]')
                reviews_text = await reviews_el.get_attribute("aria-label") if reviews_el else None
                review_count = parse_int(reviews_text)

                img_el = await item.query_selector(".s-image")
                image_url = await img_el.get_attribute("src") if img_el else None

                # BSR rank is not displayed on search result cards; leave null.
                # Detect "Best Seller" badge to surface the flag.
                bsr_badge_el = await item.query_selector(".a-badge-text")
                bsr_badge_text = (await bsr_badge_el.inner_text()).strip() if bsr_badge_el else ""
                # We'll store is_best_seller in raw_data; bsr field stays null.

                results.append(
                    ProductSearchResult(
                        asin=asin,
                        title=title,
                        brand=brand,
                        price=price,
                        rating=rating,
                        review_count=review_count,
                        image_url=image_url,
                        url=f"https://{domain}/dp/{asin}",
                        marketplace=params.marketplace,
                    )
                )
            except Exception:
                continue

    return AmazonSearchResponse(
        query=params.query,
        marketplace=params.marketplace,
        page=params.page,
        results=results,
    )
