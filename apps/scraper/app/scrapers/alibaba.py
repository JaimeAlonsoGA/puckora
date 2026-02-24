"""
Alibaba.com scraper using Playwright.

Extracts product cards from the /trade/search page, including:
- Title, images, product URL
- Supplier: name, country, years on platform, verified / trade-assurance flags,
  response rate, logo
- Pricing: min and max price, currency
- MOQ (minimum order quantity)
"""
from __future__ import annotations
import re

from app.models.requests import AlibabaSearchParams
from app.models.alibaba import (
    AlibabaSearchResponse,
    AlibabaProductResult,
    AlibabaSupplierBasic,
    PriceRange,
)
from app.core.browser import get_page
from app.utils.parsers import parse_price, parse_int

# ── Selector candidates (Alibaba's CSS changes frequently — try in order) ─────

# Product title
_TITLE_SELS = [".search-card-e-title span", ".product-header h2 span", "h2.title span"]
# Supplier name
_COMPANY_SELS = [".search-card-e-company", ".company-name", "[class*='company'] span"]
# Min price
_PRICE_MIN_SELS = [".search-card-e-price-main", ".price-main", "[class*='price-main']"]
# Max price (optional second price span)
_PRICE_MAX_SELS = [".search-card-e-price-range", "[class*='price-range']"]
# MOQ
_MOQ_SELS = ["[class*='moq']", ".search-card-e-moq", "[class*='min-order']"]
# Years on platform
_YEARS_SELS = ["[class*='yrs']", ".search-card-e-yrs", "[class*='year']"]
# Trade assurance / verified badge
_TA_SELS = ["[class*='trade-assurance']", ".search-card-e-ta", "[title*='Trade Assurance']"]
# Supplier country flag
_COUNTRY_SELS = ["[class*='country']", ".search-card-e-country", "[class*='location']"]
# Logo
_LOGO_SELS = [".company-logo img", "[class*='logo'] img"]
# Supplier link (to derive supplier_id)
_COMPANY_LINK_SELS = ["a.search-card-e-company", "a[class*='company']"]
# Response rate
_RESPONSE_SELS = ["[class*='response-rate']", "[class*='responseRate']"]


async def _try_text(el_parent, *selectors: str) -> str | None:
    for sel in selectors:
        try:
            el = await el_parent.query_selector(sel)
            if el:
                text = (await el.inner_text()).strip()
                if text:
                    return text
        except Exception:
            continue
    return None


async def _try_attr(el_parent, attr: str, *selectors: str) -> str | None:
    for sel in selectors:
        try:
            el = await el_parent.query_selector(sel)
            if el:
                val = await el.get_attribute(attr)
                if val:
                    return val.strip()
        except Exception:
            continue
    return None


def _parse_moq(text: str | None) -> int | None:
    """Parse '100 Pieces', '≥50 pcs', etc. to an integer."""
    if not text:
        return None
    m = re.search(r"(\d[\d,]*)", text)
    return int(m.group(1).replace(",", "")) if m else None


def _parse_years(text: str | None) -> int | None:
    """Parse '5 YRS' -> 5."""
    if not text:
        return None
    m = re.search(r"(\d+)", text)
    return int(m.group(1)) if m else None


def _parse_response_rate(text: str | None) -> float | None:
    """Parse '≥98.5%' or '98.5% response rate' -> 98.5."""
    if not text:
        return None
    m = re.search(r"([\d.]+)\s*%", text)
    return float(m.group(1)) if m else None


async def search(params: AlibabaSearchParams) -> AlibabaSearchResponse:
    url = (
        f"https://www.alibaba.com/trade/search?SearchText={params.query.replace(' ', '+')}"
        f"&page={params.page}"
    )
    results: list[AlibabaProductResult] = []

    async with get_page() as page:
        await page.goto(url, wait_until="domcontentloaded", timeout=30_000)

        # Try multiple container selectors
        items = await page.query_selector_all(".organic-list-item")
        if not items:
            items = await page.query_selector_all("[class*='product-card'], [class*='J-offer-wrapper']")

        for item in items[:20]:
            try:
                product_id = await item.get_attribute("data-product-id") or ""

                # ── Title ─────────────────────────────────────────────────────
                title = await _try_text(item, *_TITLE_SELS) or ""
                if not title:
                    continue  # skip ghost/ad cards

                # ── Product URL ───────────────────────────────────────────────
                link_el = await item.query_selector("a.search-card-e-title, a[class*='title']")
                href = await link_el.get_attribute("href") if link_el else None
                product_url = f"https:{href}" if href and href.startswith("//") else href

                # ── Image ─────────────────────────────────────────────────────
                image_url = await _try_attr(item, "src",
                    "img.search-image-gallery__item-img",
                    "img[class*='product-img']",
                    "img[class*='gallery']",
                )
                if not image_url:
                    image_url = await _try_attr(item, "data-src",
                        "img[data-src]",
                    )

                # ── Price range ───────────────────────────────────────────────
                min_price_text = await _try_text(item, *_PRICE_MIN_SELS)
                min_price = parse_price(min_price_text)

                max_price_text = await _try_text(item, *_PRICE_MAX_SELS)
                max_price = parse_price(max_price_text)
                if max_price and min_price and max_price < min_price:
                    max_price = None  # Guard against incorrect parses

                price_range = PriceRange(min=min_price, max=max_price) if (min_price or max_price) else None

                # ── MOQ ───────────────────────────────────────────────────────
                moq_text = await _try_text(item, *_MOQ_SELS)
                min_order_quantity = _parse_moq(moq_text)

                # ── Supplier details ──────────────────────────────────────────
                supplier_name = await _try_text(item, *_COMPANY_SELS) or "Unknown"

                # Supplier link → use path as a stable ID
                company_link = await _try_attr(item, "href", *_COMPANY_LINK_SELS)
                if company_link and company_link.startswith("//"):
                    company_link = f"https:{company_link}"
                # Derive a compact supplier ID from the URL path
                supplier_id = (
                    re.sub(r"[^\w-]", "_", company_link.split("/")[-1])
                    if company_link
                    else f"supplier_{len(results)}"
                )

                # Country
                country_text = await _try_text(item, *_COUNTRY_SELS)

                # Years on platform
                years_text = await _try_text(item, *_YEARS_SELS)
                years_on_platform = _parse_years(years_text)

                # Trade assurance / verified flag
                ta_el = await item.query_selector(", ".join(_TA_SELS))
                trade_assurance = ta_el is not None
                # "Gold Supplier" / "Verified Supplier" usually means .verified
                verified_el = await item.query_selector(
                    "[class*='verified'], [title*='Verified'], [class*='gold-supplier']"
                )
                verified = verified_el is not None or trade_assurance

                # Response rate
                response_text = await _try_text(item, *_RESPONSE_SELS)
                response_rate = _parse_response_rate(response_text)

                # Logo
                logo_url = await _try_attr(item, "src", *_LOGO_SELS)

                results.append(
                    AlibabaProductResult(
                        id=product_id or f"ali_{len(results)}",
                        title=title,
                        supplier=AlibabaSupplierBasic(
                            id=supplier_id,
                            name=supplier_name,
                            country=country_text,
                            verified=verified,
                            years_on_platform=years_on_platform,
                            response_rate=response_rate,
                            url=company_link,
                            logo_url=logo_url,
                        ),
                        min_order_quantity=min_order_quantity,
                        price_range=price_range,
                        image_url=image_url,
                        url=product_url,
                    )
                )
            except Exception:
                continue

    return AlibabaSearchResponse(
        query=params.query,
        page=params.page,
        total=len(results),
        results=results,
    )
