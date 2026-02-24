"""
alibaba router
==============
POST /scrape/alibaba/search
  - Enforces dailySearches plan limit
  - Scrapes Alibaba for supplier listings
  - Upserts scraped data into suppliers + supplier_products tables
  - Returns results to frontend
"""
from __future__ import annotations

from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Request

from app.core.config import settings
from app.core.plan_gate import plan_gate
from app.models.requests import AlibabaSearchParams
from app.models.alibaba import AlibabaSearchResponse
from app.scrapers import alibaba as alibaba_scraper

router = APIRouter()


def _get_service_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.supabase_url,
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        timeout=10.0,
    )


async def _upsert_suppliers(response: AlibabaSearchResponse) -> None:
    """Fire-and-forget upsert of scraped suppliers + products into Supabase."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return  # Skip in environments without Supabase configured

    now = datetime.now(timezone.utc).isoformat()

    for item in response.results:
        sup = item.supplier
        try:
            async with _get_service_client() as client:
                # ── Upsert supplier ─────────────────────────────────────────
                sup_payload = {
                    "alibaba_id": sup.id,
                    "name": sup.name,
                    "url": sup.url,
                    "country": sup.country,
                    "years_on_platform": sup.years_on_platform,
                    "is_verified": sup.verified,
                    "response_rate_pct": sup.response_rate,
                    "scraped_at": now,
                    "needs_refresh_at": now,
                }

                sup_resp = await client.post(
                    "/rest/v1/suppliers",
                    json=sup_payload,
                    headers={"Prefer": "resolution=merge-duplicates,return=representation"},
                )
                if sup_resp.status_code not in (200, 201):
                    print(f"[alibaba] supplier upsert failed: {sup_resp.status_code}")
                    continue

                # Extract the supplier UUID assigned by Supabase
                sup_rows = sup_resp.json()
                supplier_id: str | None = None
                if isinstance(sup_rows, list) and sup_rows:
                    supplier_id = sup_rows[0].get("id")
                elif isinstance(sup_rows, dict):
                    supplier_id = sup_rows.get("id")

                if not supplier_id:
                    continue

                # ── Upsert supplier_product ─────────────────────────────────
                price = item.price_range
                prod_payload = {
                    "supplier_id": supplier_id,
                    "alibaba_product_id": item.id,
                    "title": item.title,
                    "image_url": item.image_url,
                    "price_min": price.min if price else None,
                    "price_max": price.max if price else None,
                    "currency": price.currency if price else "USD",
                    "moq": item.min_order_quantity or 1,
                    "scraped_at": now,
                }

                await client.post(
                    "/rest/v1/supplier_products",
                    json=prod_payload,
                    headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
                )

        except Exception as exc:
            # Non-fatal — log and continue
            print(f"[alibaba] upsert error for supplier {sup.id}: {exc}")


@router.post(
    "/search",
    response_model=AlibabaSearchResponse,
    dependencies=[plan_gate("dailySearches")],
)
async def search_alibaba(
    request: Request,
    params: AlibabaSearchParams,
) -> AlibabaSearchResponse:
    try:
        result = await alibaba_scraper.search(params)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Best-effort upsert (non-blocking error handling inside)
    try:
        await _upsert_suppliers(result)
    except Exception as exc:
        print(f"[alibaba] background upsert failed: {exc}")

    return result
