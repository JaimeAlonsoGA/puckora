"""
SP-API ProductFees v0
=====================
Calls ``POST /products/fees/v0/items/{Asin}/feesEstimate`` to get accurate
FBA referral + fulfillment fees for a given ASIN and price point.

Falls back to rough estimates when SP-API credentials are not configured.
"""
from __future__ import annotations

from app.models.requests import SpApiFeeParams
from app.sp_api.client import MARKETPLACE_IDS, is_configured, sp_request


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

async def estimate(params: SpApiFeeParams) -> dict:
    """
    Return fee breakdown for *params.asin* at *params.price*.
    Uses real SP-API when credentials are present, otherwise falls back to stub.
    """
    if is_configured():
        return await _real_estimate(params)
    return _stub_estimate(params)


# ---------------------------------------------------------------------------
# Real SP-API implementation
# ---------------------------------------------------------------------------

async def _real_estimate(params: SpApiFeeParams) -> dict:
    price = params.price or 0.0
    marketplace_id = MARKETPLACE_IDS.get(params.marketplace, "ATVPDKIKX0DER")

    body = {
        "FeesEstimateRequest": {
            "MarketplaceId": marketplace_id,
            "IsAmazonFulfilled": True,
            "PriceToEstimateFees": {
                "ListingPrice": {"CurrencyCode": "USD", "Amount": price},
                "Shipping": {"CurrencyCode": "USD", "Amount": 0.0},
            },
            "Identifier": params.asin,
            "OptionalFulfillmentProgram": "FBA_CORE",
        }
    }

    data = await sp_request(
        "POST",
        params.marketplace,
        f"/products/fees/v0/items/{params.asin}/feesEstimate",
        body=body,
    )

    result = data.get("payload", {}).get("FeesEstimateResult", {})
    fee_estimate = result.get("FeesEstimate", {})
    total = fee_estimate.get("TotalFeesEstimate", {}).get("Amount", 0.0)

    # Build a flat component map from FeeDetailList
    components: dict[str, float] = {}
    for item in fee_estimate.get("FeeDetailList", []):
        fee_type = item.get("FeeType", "Unknown")
        amount = item.get("FeeAmount", {}).get("Amount", 0.0)
        components[fee_type] = round(amount, 2)
        # Recurse into IncludedFeeDetailList for sub-components
        for sub in item.get("IncludedFeeDetailList", []):
            sub_type = sub.get("FeeType", "Unknown")
            components[sub_type] = round(sub.get("FeeAmount", {}).get("Amount", 0.0), 2)

    return {
        "asin": params.asin,
        "marketplace": params.marketplace,
        "price": price,
        "referral_fee": components.get("ReferralFee", 0.0),
        "fba_fulfillment_fee": components.get("FBAFees", components.get("PickAndPackFee", 0.0)),
        "variable_closing_fee": components.get("VariableClosingFee", 0.0),
        "total_fees": round(total, 2),
        "fee_components": components,
        "source": "sp-api",
    }


# ---------------------------------------------------------------------------
# Stub fallback
# ---------------------------------------------------------------------------

def _stub_estimate(params: SpApiFeeParams) -> dict:
    """Rough fee estimates used when SP-API credentials are not configured."""
    price = params.price or 0.0
    referral = round(price * 0.15, 2)
    fba = 3.22  # typical small-standard item

    return {
        "asin": params.asin,
        "marketplace": params.marketplace,
        "price": price,
        "referral_fee": referral,
        "fba_fulfillment_fee": fba,
        "variable_closing_fee": 0.0,
        "total_fees": round(referral + fba, 2),
        "fee_components": {"ReferralFee": referral, "FBAFees": fba},
        "source": "stub",
    }
