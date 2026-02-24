"""
SP-API ProductPricing v0
========================
Retrieves the buy-box price and competitive pricing offers for a single ASIN
via ``GET /products/pricing/v0/price``.

Docs: https://developer-docs.amazon.com/sp-api/reference/getpricing
"""
from __future__ import annotations

from app.sp_api.client import MARKETPLACE_IDS, is_configured, sp_request


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

async def get_pricing(asin: str, marketplace: str = "US") -> dict:
    """
    Return buy-box / competitive pricing for *asin* in *marketplace*.

    Falls back to a stub when credentials are absent.
    """
    if not is_configured():
        return _stub_pricing(asin, marketplace)

    marketplace_id = MARKETPLACE_IDS.get(marketplace, "ATVPDKIKX0DER")

    data = await sp_request(
        "GET",
        marketplace,
        "/products/pricing/v0/price",
        params={
            "MarketplaceId": marketplace_id,
            "Asins": asin,
            "ItemType": "Asin",
        },
    )

    return _parse(data, asin, marketplace)


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def _parse(data: dict, asin: str, marketplace: str) -> dict:
    payload: list[dict] = data.get("payload", [])
    if not payload:
        return _stub_pricing(asin, marketplace)

    item = payload[0]
    product: dict = item.get("Product", {})
    summary: dict = product.get("Summary", {})

    # ── Buy-box ────────────────────────────────────────────────────────────
    buy_box_prices: list[dict] = summary.get("BuyBoxPrices", [])
    bb_entry = buy_box_prices[0] if buy_box_prices else {}
    buy_box_price: float | None = _amount(bb_entry.get("ListingPrice"))
    buy_box_landed: float | None = _amount(bb_entry.get("LandedPrice"))
    buy_box_condition: str | None = bb_entry.get("condition")

    # ── Number of offers ───────────────────────────────────────────────────
    total_offer_count: int = summary.get("TotalOfferCount", 0)

    # ── Competitive prices ─────────────────────────────────────────────────
    competitive: list[dict] = (
        product.get("CompetitivePricing", {}).get("CompetitivePrices", [])
    )
    competitive_parsed = [
        {
            "condition": p.get("condition"),
            "belongs_to_requester": p.get("belongsToRequester", False),
            "listing_price": _amount(p.get("Price", {}).get("ListingPrice")),
            "landed_price": _amount(p.get("Price", {}).get("LandedPrice")),
            "shipping": _amount(p.get("Price", {}).get("Shipping")),
        }
        for p in competitive
    ]

    # ── Lowest new & used ──────────────────────────────────────────────────
    lowest_prices: list[dict] = summary.get("LowestPrices", [])
    lowest_new: float | None = next(
        (_amount(lp.get("ListingPrice")) for lp in lowest_prices if lp.get("condition") == "new"),
        None,
    )
    lowest_used: float | None = next(
        (_amount(lp.get("ListingPrice")) for lp in lowest_prices if lp.get("condition") == "used"),
        None,
    )

    return {
        "asin": asin,
        "marketplace": marketplace,
        "buy_box_price": buy_box_price,
        "buy_box_landed_price": buy_box_landed,
        "buy_box_condition": buy_box_condition,
        "total_offer_count": total_offer_count,
        "lowest_new_price": lowest_new,
        "lowest_used_price": lowest_used,
        "competitive_prices": competitive_parsed,
        "source": "sp-api",
    }


def _amount(obj: dict | None) -> float | None:
    if obj is None:
        return None
    amt = obj.get("Amount")
    return float(amt) if amt is not None else None


# ---------------------------------------------------------------------------
# Stub
# ---------------------------------------------------------------------------

def _stub_pricing(asin: str, marketplace: str) -> dict:
    return {
        "asin": asin,
        "marketplace": marketplace,
        "buy_box_price": None,
        "buy_box_landed_price": None,
        "buy_box_condition": None,
        "total_offer_count": None,
        "lowest_new_price": None,
        "lowest_used_price": None,
        "competitive_prices": [],
        "source": "stub",
    }
