"""
SP-API CatalogItems 2022-04-01
==============================
Retrieves product identity, images, category rankings and product-type for
a single ASIN via ``GET /catalog/2022-04-01/items/{asin}``.

Docs: https://developer-docs.amazon.com/sp-api/reference/get-catalog-item
"""
from __future__ import annotations

from app.sp_api.client import MARKETPLACE_IDS, is_configured, sp_request

# Data groups we want back from the API
_INCLUDED_DATA = "attributes,images,productTypes,summaries,salesRanks"


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

async def get_catalog_item(asin: str, marketplace: str = "US") -> dict:
    """
    Return normalised catalog data for *asin* in *marketplace*.

    When SP-API credentials are absent, returns a minimal stub dict so the
    combined lookup can still be assembled.
    """
    if not is_configured():
        return _stub_catalog(asin, marketplace)

    marketplace_id = MARKETPLACE_IDS.get(marketplace, "ATVPDKIKX0DER")

    data = await sp_request(
        "GET",
        marketplace,
        f"/catalog/2022-04-01/items/{asin}",
        params={
            "marketplaceIds": marketplace_id,
            "includedData": _INCLUDED_DATA,
        },
    )

    return _parse(data, asin, marketplace, marketplace_id)


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def _parse(data: dict, asin: str, marketplace: str, marketplace_id: str) -> dict:
    # ── Summaries ──────────────────────────────────────────────────────────
    summaries: list[dict] = data.get("summaries", [])
    summary = (
        next((s for s in summaries if s.get("marketplaceId") == marketplace_id), None)
        or (summaries[0] if summaries else {})
    )

    # ── Main image ─────────────────────────────────────────────────────────
    images_sets: list[dict] = data.get("images", [])
    img_list: list[dict] = next(
        (g.get("images", []) for g in images_sets if g.get("marketplaceId") == marketplace_id),
        [],
    )
    main_image: str | None = next(
        (img["link"] for img in img_list if img.get("variant") == "MAIN"),
        None,
    )

    # ── Sales ranks ────────────────────────────────────────────────────────
    ranks_sets: list[dict] = data.get("salesRanks", [])
    class_ranks: list[dict] = next(
        (r.get("classificationRanks", []) for r in ranks_sets if r.get("marketplaceId") == marketplace_id),
        [],
    )
    display_ranks: list[dict] = next(
        (r.get("displayGroupRanks", []) for r in ranks_sets if r.get("marketplaceId") == marketplace_id),
        [],
    )
    bsr_entry = class_ranks[0] if class_ranks else (display_ranks[0] if display_ranks else {})

    # ── Product type ───────────────────────────────────────────────────────
    product_types: list[dict] = data.get("productTypes", [])
    product_type: str | None = product_types[0].get("productType") if product_types else None

    return {
        "asin": asin,
        "title": summary.get("itemName"),
        "brand": summary.get("brand"),
        "manufacturer": summary.get("manufacturer"),
        "model_number": summary.get("modelNumber"),
        "product_type": product_type,
        "main_image": main_image,
        "bsr": bsr_entry.get("rank"),
        "bsr_category": bsr_entry.get("title") or bsr_entry.get("displayName"),
        "marketplace": marketplace,
        "source": "sp-api",
    }


# ---------------------------------------------------------------------------
# Stub
# ---------------------------------------------------------------------------

def _stub_catalog(asin: str, marketplace: str) -> dict:
    return {
        "asin": asin,
        "title": None,
        "brand": None,
        "manufacturer": None,
        "model_number": None,
        "product_type": None,
        "main_image": None,
        "bsr": None,
        "bsr_category": None,
        "marketplace": marketplace,
        "source": "stub",
    }
