"""
SP-API router
=============
Routes:
  POST /sp-api/fees                – FBA fee estimate (ProductFeesV0)
  GET  /sp-api/catalog/{asin}      – Catalog item details (CatalogItemsV2022)
  GET  /sp-api/pricing/{asin}      – Buy-box & competitive pricing (PricingV0)
  POST /sp-api/lookup              – Combined single-ASIN lookup (all three)
  POST /sp-api/bulk-lookup         – Parallel lookup for up to 20 ASINs
"""
from __future__ import annotations

import asyncio
import math

from fastapi import APIRouter, HTTPException, Query

from app.models.requests import (
    SpApiBulkLookupParams,
    SpApiFeeParams,
    SpApiLookupParams,
)
from app.sp_api import catalog as sp_catalog
from app.sp_api import fees as sp_fees
from app.sp_api import pricing as sp_pricing

router = APIRouter()


# ---------------------------------------------------------------------------
# Transformation helpers
# ---------------------------------------------------------------------------

def to_table_row(data: dict) -> dict:
    """Transform raw SP-API result to frontend-friendly SpApiTableRow."""
    asin = data.get("asin")
    marketplace = data.get("marketplace")
    catalog = data.get("catalog") or {}
    pricing = data.get("pricing") or {}
    fees = data.get("fees") or {}
    errors = data.get("errors") or {}

    buy_box_price = pricing.get("buy_box_price")
    total_fees = fees.get("total_fees")

    # Calculate net revenue and margin
    net_revenue = None
    margin_pct = None
    if buy_box_price is not None and total_fees is not None:
        net_revenue = round((buy_box_price - total_fees) * 100) / 100
        if buy_box_price > 0:
            margin_pct = round((net_revenue / buy_box_price) * 10000) / 100

    # Determine data source
    has_errors = any(errors.values())
    if catalog.get("source") == "sp-api" or pricing.get("source") == "sp-api" or fees.get("source") == "sp-api":
        source = "partial" if has_errors else "sp-api"
    else:
        source = "stub"

    return {
        "asin": asin,
        "title": catalog.get("title"),
        "brand": catalog.get("brand"),
        "product_type": catalog.get("product_type"),
        "main_image": catalog.get("main_image"),
        "bsr": catalog.get("bsr"),
        "bsr_category": catalog.get("bsr_category"),
        "buy_box_price": buy_box_price,
        "lowest_new_price": pricing.get("lowest_new_price"),
        "total_offer_count": pricing.get("total_offer_count"),
        "referral_fee": fees.get("referral_fee"),
        "fba_fulfillment_fee": fees.get("fba_fulfillment_fee"),
        "total_fees": total_fees,
        "net_revenue": net_revenue,
        "margin_pct": margin_pct,
        "marketplace": marketplace,
        "source": source,
        "errors": errors,
    }


# ---------------------------------------------------------------------------
# Individual endpoints
# ---------------------------------------------------------------------------

@router.post("/fees")
async def get_fees(params: SpApiFeeParams) -> dict:
    """Estimate FBA fees for an ASIN at a given price."""
    try:
        return await sp_fees.estimate(params)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/catalog/{asin}")
async def get_catalog(
    asin: str,
    marketplace: str = Query(default="US"),
) -> dict:
    """Retrieve catalog metadata for a single ASIN from CatalogItems 2022-04-01."""
    try:
        return await sp_catalog.get_catalog_item(asin.upper(), marketplace)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/pricing/{asin}")
async def get_pricing(
    asin: str,
    marketplace: str = Query(default="US"),
) -> dict:
    """Retrieve buy-box and competitive pricing for a single ASIN."""
    try:
        return await sp_pricing.get_pricing(asin.upper(), marketplace)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Combined lookup  (most useful for the frontend table)
# ---------------------------------------------------------------------------

@router.post("/lookup")
async def sp_api_lookup(params: SpApiLookupParams) -> dict:
    """
    Fetch catalog info, pricing, and fee estimate for a single ASIN
    in one call — all three sub-requests are executed in parallel.
    Returns a table row ready for display.
    """
    fee_params = SpApiFeeParams(
        asin=params.asin,
        marketplace=params.marketplace,
        price=params.price,
    )

    catalog_result, pricing_result, fees_result = await asyncio.gather(
        sp_catalog.get_catalog_item(params.asin, params.marketplace),
        sp_pricing.get_pricing(params.asin, params.marketplace),
        sp_fees.estimate(fee_params),
        return_exceptions=True,
    )

    def _safe(r: object) -> dict | None:
        return r if not isinstance(r, Exception) else None  # type: ignore[return-value]

    def _err(r: object) -> str | None:
        return str(r) if isinstance(r, Exception) else None

    raw_result = {
        "asin": params.asin,
        "marketplace": params.marketplace,
        "catalog": _safe(catalog_result),
        "pricing": _safe(pricing_result),
        "fees": _safe(fees_result),
        "errors": {
            "catalog": _err(catalog_result),
            "pricing": _err(pricing_result),
            "fees": _err(fees_result),
        },
    }

    return {
        "row": to_table_row(raw_result),
        "raw": raw_result,
    }


@router.post("/bulk-lookup")
async def sp_api_bulk_lookup(params: SpApiBulkLookupParams) -> dict:
    """
    Parallel combined lookup for up to 20 ASINs.
    Returns transformed rows ready for display.
    """
    async def _single(asin: str) -> tuple[str, dict, dict]:
        single_params = SpApiLookupParams(
            asin=asin,
            marketplace=params.marketplace,
            price=params.price,
        )
        fee_params = SpApiFeeParams(
            asin=asin,
            marketplace=params.marketplace,
            price=params.price,
        )
        catalog_r, pricing_r, fees_r = await asyncio.gather(
            sp_catalog.get_catalog_item(asin, params.marketplace),
            sp_pricing.get_pricing(asin, params.marketplace),
            sp_fees.estimate(fee_params),
            return_exceptions=True,
        )

        def _safe(r: object) -> dict | None:
            return r if not isinstance(r, Exception) else None  # type: ignore[return-value]

        def _err(r: object) -> str | None:
            return str(r) if isinstance(r, Exception) else None

        raw = {
            "asin": asin,
            "marketplace": params.marketplace,
            "catalog": _safe(catalog_r),
            "pricing": _safe(pricing_r),
            "fees": _safe(fees_r),
            "errors": {
                "catalog": _err(catalog_r),
                "pricing": _err(pricing_r),
                "fees": _err(fees_r),
            },
        }

        return asin, to_table_row(raw), raw

    try:
        results = await asyncio.gather(*[_single(asin) for asin in params.asins])
        rows = [row for _, row, _ in results]
        raw_dict = {asin: raw for asin, _, raw in results}
        return {
            "rows": rows,
            "marketplace": params.marketplace,
            "_raw": raw_dict,
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

