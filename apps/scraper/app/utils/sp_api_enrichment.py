"""
sp_api_enrichment.py
--------------------
Background task that enriches a scraped product record with SP-API data.

Runs after the Playwright scrape, fills in authoritative data:
  - BSR + category (from catalog)
  - Buy-box price / offer count (from pricing)
  - FBA fees + net margin (from fees)
  - Monthly sales estimate (from Keepa or BSR estimation)

On completion, updates the `products` and `product_details` rows in Supabase
via the service-role key (bypasses RLS).
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import httpx

from app.core.config import settings
from app.models.amazon import AmazonProductDetail
from app.models.requests import SpApiFeeParams
from app.sp_api import catalog as sp_catalog, pricing as sp_pricing, fees as sp_fees


_SUPABASE_HEADERS = lambda: {  # noqa: E731
    "apikey": settings.supabase_service_role_key,
    "Authorization": f"Bearer {settings.supabase_service_role_key}",
    "Content-Type": "application/json",
}


async def _get_product_uuid(asin: str, marketplace: str) -> str | None:
    """Look up the internal UUID of a product row by (asin, marketplace)."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    async with httpx.AsyncClient(
        base_url=settings.supabase_url,
        headers=_SUPABASE_HEADERS(),
        timeout=5.0,
    ) as client:
        resp = await client.get(
            "/rest/v1/products",
            params={
                "asin": f"eq.{asin}",
                "marketplace": f"eq.{marketplace}",
                "select": "id",
                "limit": "1",
            },
        )
        rows = resp.json() if resp.status_code == 200 else []
        return rows[0]["id"] if rows else None


async def _patch_products(product_uuid: str, patch: dict) -> None:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return
    async with httpx.AsyncClient(
        base_url=settings.supabase_url,
        headers={**_SUPABASE_HEADERS(), "Prefer": "return=minimal"},
        timeout=5.0,
    ) as client:
        await client.patch(
            "/rest/v1/products",
            params={"id": f"eq.{product_uuid}"},
            json=patch,
        )


async def _patch_product_details(product_uuid: str, patch: dict) -> None:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return
    async with httpx.AsyncClient(
        base_url=settings.supabase_url,
        headers={**_SUPABASE_HEADERS(), "Prefer": "return=minimal"},
        timeout=5.0,
    ) as client:
        await client.patch(
            "/rest/v1/product_details",
            params={"product_id": f"eq.{product_uuid}"},
            json=patch,
        )


async def enrich_product(detail: AmazonProductDetail) -> None:
    """
    Run SP-API catalog + pricing + fees in parallel, then persist enrichment
    back to Supabase.  Designed to be fire-and-forget from the Amazon router.
    """
    asin = detail.asin
    marketplace = detail.marketplace

    try:
        # ── SP-API calls in parallel ────────────────────────────────────────
        catalog_task = asyncio.create_task(
            sp_catalog.get_catalog_item(asin, marketplace)
        )
        pricing_task = asyncio.create_task(
            sp_pricing.get_pricing(asin, marketplace)
        )
        fees_task = asyncio.create_task(
            sp_fees.estimate(SpApiFeeParams(
                asin=asin,
                marketplace=marketplace,
                price=detail.price,
                weight_kg=detail.weight_kg,
            ))
        )

        catalog_data, pricing_data, fees_data = await asyncio.gather(
            catalog_task, pricing_task, fees_task, return_exceptions=True
        )

        # Resolve exceptions to empty dicts so merging still works
        def _safe(result: object) -> dict:
            if isinstance(result, (dict,)):
                return result
            if isinstance(result, Exception):
                print(f"[sp_enrich] SP-API sub-task error: {result}")
            return {}

        catalog = _safe(catalog_data)
        pricing = _safe(pricing_data)
        fees = _safe(fees_data)

        # ── Compute net revenue + margin ────────────────────────────────────
        buy_box: float | None = pricing.get("buy_box_price")
        total_fees: float | None = fees.get("total_fees")
        net_revenue: float | None = None
        margin_pct: float | None = None
        if buy_box and total_fees is not None:
            net_revenue = round(buy_box - total_fees, 2)
            if buy_box > 0:
                margin_pct = round((net_revenue / buy_box) * 100, 2)

        # ── Look up internal UUID ───────────────────────────────────────────
        product_uuid = await _get_product_uuid(asin, marketplace)
        if not product_uuid:
            return  # Product not in DB yet — nothing to patch

        now = datetime.now(timezone.utc).isoformat()

        # ── Patch `products` row ────────────────────────────────────────────
        products_patch: dict = {"updated_at": now}
        if catalog.get("bsr") is not None:
            products_patch["bsr"] = catalog["bsr"]
        if catalog.get("bsr_category"):
            products_patch["bsr_category"] = catalog["bsr_category"]
        if pricing.get("buy_box_price") is not None:
            products_patch["price"] = pricing["buy_box_price"]
        if pricing.get("total_offer_count") is not None:
            products_patch["seller_count"] = pricing["total_offer_count"]
        if fees.get("total_fees") is not None:
            products_patch["fba_fees"] = fees["total_fees"]
        if net_revenue is not None:
            products_patch["net_revenue"] = net_revenue
        if margin_pct is not None:
            products_patch["margin_pct"] = margin_pct

        if len(products_patch) > 1:  # has more than just updated_at
            await _patch_products(product_uuid, products_patch)

        # ── Patch `product_details` row ─────────────────────────────────────
        details_patch: dict = {"updated_at": now}
        if fees.get("referral_fee") is not None:
            details_patch["referral_fee"] = fees["referral_fee"]
        if fees.get("fba_fulfillment_fee") is not None:
            details_patch["fba_fulfillment_fee"] = fees["fba_fulfillment_fee"]
        if pricing.get("lowest_new_price") is not None:
            details_patch["lowest_new_price"] = pricing["lowest_new_price"]

        if len(details_patch) > 1:
            await _patch_product_details(product_uuid, details_patch)

        print(
            f"[sp_enrich] {asin}/{marketplace} enriched — "
            f"BSR={products_patch.get('bsr')}, "
            f"price={products_patch.get('price')}, "
            f"margin={products_patch.get('margin_pct')}%"
        )

    except Exception as exc:
        print(f"[sp_enrich] Enrichment failed for {asin}/{marketplace}: {exc}")
