"""
Amazon product detail page scraper.
"""
from __future__ import annotations
import re

from app.models.requests import AmazonProductParams
from app.models.amazon import AmazonProductDetail, ReviewItem
from app.core.browser import get_page
from app.utils.parsers import parse_price, parse_float, parse_int

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

# kg conversions (Amazon shows weight in various units across locales)
_LBS_TO_KG = 0.453592
_OZ_TO_KG = 0.0283495
_G_TO_KG = 0.001


def _parse_weight_kg(text: str | None) -> float | None:
    """Parse a weight string such as '1.5 pounds' or '700 grams' to kg."""
    if not text:
        return None
    text = text.strip().lower()
    # Extract number
    m = re.search(r"([\d,.]+)", text)
    if not m:
        return None
    value = float(m.group(1).replace(",", ""))
    if "pound" in text or " lb" in text:
        return round(value * _LBS_TO_KG, 3)
    if "ounce" in text or " oz" in text:
        return round(value * _OZ_TO_KG, 3)
    if "gram" in text and "kilo" not in text:
        return round(value * _G_TO_KG, 3)
    if "kilogram" in text or " kg" in text:
        return round(value, 3)
    return None


def _parse_dimensions(text: str | None) -> dict | None:
    """Parse '10.2 x 4.5 x 2.1 inches' to {l, w, h} in cm."""
    if not text:
        return None
    # Match three numbers separated by 'x'
    m = re.findall(r"([\d.]+)", text)
    if len(m) < 3:
        return None
    nums = [float(v) for v in m[:3]]
    is_inches = "inch" in text.lower() or '"' in text
    factor = 2.54 if is_inches else 1.0  # cm otherwise
    return {"l": round(nums[0] * factor, 2), "w": round(nums[1] * factor, 2), "h": round(nums[2] * factor, 2)}


async def _get_tech_spec(page, *label_patterns: str) -> str | None:
    """
    Search both the tech-spec table (#productDetails_techSpec_section_1) and
    the detailed specs table (#productDetails_detailBullets_sections1) for a
    row whose header matches any of the supplied patterns.
    """
    table_selectors = [
        "#productDetails_techSpec_section_1 tr",
        "#productDetails_detailBullets_sections1 tr",
        "#detailBullets_feature_div li",
    ]
    for sel in table_selectors:
        rows = await page.query_selector_all(sel)
        for row in rows:
            try:
                row_text = (await row.inner_text()).lower()
                if any(pat.lower() in row_text for pat in label_patterns):
                    # Value is in the td/span that doesn't contain the header text
                    cells = await row.query_selector_all("td, span")
                    # Take the last non-empty cell as the value
                    for cell in reversed(cells):
                        val = (await cell.inner_text()).strip()
                        # Skip if it matches one of the header patterns
                        if val and not any(pat.lower() in val.lower() for pat in label_patterns):
                            return val
            except Exception:
                continue
    return None


async def _get_reviews(page, max_reviews: int = 10) -> list[ReviewItem]:
    """Scrape the top customer reviews from the product page."""
    reviews: list[ReviewItem] = []
    review_els = await page.query_selector_all("#cm_cr-review_list .review, [data-hook='review']")

    for el in review_els[:max_reviews]:
        try:
            review_id = await el.get_attribute("id") or ""

            title_el = await el.query_selector("[data-hook='review-title'] span:not(.a-icon-alt)")
            title = (await title_el.inner_text()).strip() if title_el else None

            body_el = await el.query_selector("[data-hook='review-body'] span, .review-text-content span")
            body = (await body_el.inner_text()).strip() if body_el else ""
            if not body:
                continue

            star_el = await el.query_selector(".a-icon-star .a-icon-alt, [data-hook='review-star-rating'] .a-icon-alt")
            star_text = (await star_el.inner_text()) if star_el else "0"
            rating = int(float(star_text.split()[0])) if star_text else 0

            date_el = await el.query_selector("[data-hook='review-date']")
            date = (await date_el.inner_text()).strip() if date_el else None

            verified_el = await el.query_selector("[data-hook='avp-badge']")
            verified = verified_el is not None

            helpful_el = await el.query_selector("[data-hook='helpful-vote-statement']")
            helpful_text = (await helpful_el.inner_text()) if helpful_el else "0"
            helpful_votes = parse_int(helpful_text) or 0

            reviews.append(ReviewItem(
                id=review_id or f"rev_{len(reviews)}",
                title=title,
                body=body[:2000],
                rating=rating,
                date=date,
                verified=verified,
                helpful_votes=helpful_votes,
            ))
        except Exception:
            continue

    return reviews


async def get_detail(params: AmazonProductParams) -> AmazonProductDetail:
    domain = MARKETPLACE_DOMAINS.get(params.marketplace, "www.amazon.com")
    url = f"https://{domain}/dp/{params.asin}"

    async with get_page() as page:
        await page.goto(url, wait_until="domcontentloaded", timeout=30_000)

        # ── Core fields ───────────────────────────────────────────────────────
        title_el = await page.query_selector("#productTitle")
        title = (await title_el.inner_text()).strip() if title_el else params.asin

        # Brand
        brand: str | None = None
        brand_el = await page.query_selector("#bylineInfo")
        if brand_el:
            brand_text = (await brand_el.inner_text()).strip()
            # Strip "Visit the X Store" / "Brand: X" prefixes
            for prefix in ("brand:", "visit the", "by "):
                if brand_text.lower().startswith(prefix):
                    brand_text = brand_text[len(prefix):].strip()
            brand_text = re.sub(r"\s+store\s*$", "", brand_text, flags=re.IGNORECASE).strip()
            brand = brand_text or None

        price_el = await page.query_selector(".a-price .a-offscreen")
        price_text = await price_el.inner_text() if price_el else None
        price = parse_price(price_text)

        rating_el = await page.query_selector("#acrPopover .a-icon-alt")
        rating_text = await rating_el.inner_text() if rating_el else None
        rating = parse_float(rating_text.split()[0] if rating_text else None)

        reviews_el = await page.query_selector("#acrCustomerReviewText")
        reviews_text = await reviews_el.inner_text() if reviews_el else None
        review_count = int("".join(filter(str.isdigit, reviews_text or ""))) if reviews_text else None

        # ── Description ───────────────────────────────────────────────────────
        desc_el = await page.query_selector("#productDescription p, #productDescription_feature_div p")
        description: str | None = None
        if desc_el:
            description = (await desc_el.inner_text()).strip() or None

        # ── Bullet points ─────────────────────────────────────────────────────
        bullets_els = await page.query_selector_all("#feature-bullets li span.a-list-item")
        bullet_points = [
            (await el.inner_text()).strip()
            for el in bullets_els
            if (await el.inner_text()).strip()
        ]

        # ── Images ───────────────────────────────────────────────────────────
        img_els = await page.query_selector_all("#altImages img")
        image_urls = [await el.get_attribute("src") or "" for el in img_els]
        image_urls = [u for u in image_urls if u and "transparent-pixel" not in u]

        # If no alt images, check main image
        if not image_urls:
            main_img_el = await page.query_selector("#imgTagWrapperId img, #landingImage")
            if main_img_el:
                src = await main_img_el.get_attribute("src") or ""
                if src:
                    image_urls = [src]

        # ── BSR ───────────────────────────────────────────────────────────────
        bsr_el = await page.query_selector("#SalesRank, #detailBullets_feature_div .a-list-item")
        bsr_text = await bsr_el.inner_text() if bsr_el else None
        bsr: int | None = None
        bsr_category: str | None = None
        if bsr_text and ("best seller" in bsr_text.lower() or "rank" in bsr_text.lower() or "#" in bsr_text):
            # Extract first rank number
            digits = "".join(filter(str.isdigit, bsr_text.split("\n")[0]))
            bsr = int(digits) if digits else None
            # Extract category from parenthetical like "(in Blenders)"
            cat_m = re.search(r"in\s+([^\n(#]+?)(?:\s+\(|$)", bsr_text, re.IGNORECASE)
            bsr_category = cat_m.group(1).strip() if cat_m else None

        # ── Tech specs: weight and dimensions ────────────────────────────────
        weight_text = await _get_tech_spec(page, "item weight", "weight")
        weight_kg = _parse_weight_kg(weight_text)

        dims_text = await _get_tech_spec(page, "item dimensions", "product dimensions", "dimensions")
        dimensions_cm = _parse_dimensions(dims_text)

        # ── Category breadcrumb path ──────────────────────────────────────────
        breadcrumb_els = await page.query_selector_all(
            "#wayfinding-breadcrumbs_feature_div ul li:not(.a-breadcrumb-divider) .a-link-normal"
        )
        crumbs = []
        for el in breadcrumb_els:
            try:
                crumbs.append((await el.inner_text()).strip())
            except Exception:
                continue
        category_path = " > ".join(crumbs) if crumbs else None

        # ── Seller count (available/FBA sellers from "Other Sellers" widget) ──
        seller_count: int | None = None
        seller_el = await page.query_selector("#olpLinkWidget_feature_div .olp-padding-right")
        if seller_el:
            seller_text = await seller_el.inner_text()
            m = re.search(r"(\d[\d,]*)\s+(?:new|used|offer)", seller_text, re.IGNORECASE)
            if m:
                seller_count = int(m.group(1).replace(",", ""))

        # ── Sample reviews ────────────────────────────────────────────────────
        reviews_sample = await _get_reviews(page, max_reviews=10)

        return AmazonProductDetail(
            asin=params.asin,
            marketplace=params.marketplace,
            title=title,
            brand=brand,
            description=description,
            price=price,
            rating=rating,
            review_count=review_count,
            bullet_points=bullet_points[:10],
            image_urls=image_urls[:8],
            bsr=bsr,
            bsr_category=bsr_category,
            category_path=category_path,
            weight_kg=weight_kg,
            dimensions=dimensions_cm,
            seller_count=seller_count,
            reviews_sample=reviews_sample,
        )
