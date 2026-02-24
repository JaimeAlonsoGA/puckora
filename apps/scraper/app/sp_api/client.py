"""
SP-API Base Client
==================
Handles:
  - LWA (Login with Amazon) OAuth2 token refresh with in-memory caching
  - AWS Signature V4 request signing via botocore
  - Throttle-aware retry with exponential back-off (up to 3 attempts)
  - Marketplace → region / base-URL / ID routing

Usage:
    from app.sp_api.client import sp_request, MARKETPLACE_IDS

    data = await sp_request("GET", "US", "/catalog/2022-04-01/items/B08XYZ1234",
                            params={"marketplaceIds": "ATVPDKIKX0DER"})
"""
from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass
from typing import Any

import httpx
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials

from app.core.config import settings

# ---------------------------------------------------------------------------
# Marketplace routing tables
# ---------------------------------------------------------------------------

MARKETPLACE_IDS: dict[str, str] = {
    "US": "ATVPDKIKX0DER",
    "CA": "A2EUQ1WTGCTBG2",
    "UK": "A1F83G8C2ARO7P",
    "DE": "A1PA6795UKMFR9",
    "FR": "A13V1IB3VIYZZH",
    "IT": "APJ6JRA9NG5V4",
    "ES": "A1RKKUPIHCS9HS",
    "JP": "A1VC38T7YXB528",
}

_BASE_URLS: dict[str, str] = {
    "US": "https://sellingpartnerapi-na.amazon.com",
    "CA": "https://sellingpartnerapi-na.amazon.com",
    "UK": "https://sellingpartnerapi-eu.amazon.com",
    "DE": "https://sellingpartnerapi-eu.amazon.com",
    "FR": "https://sellingpartnerapi-eu.amazon.com",
    "IT": "https://sellingpartnerapi-eu.amazon.com",
    "ES": "https://sellingpartnerapi-eu.amazon.com",
    "JP": "https://sellingpartnerapi-fe.amazon.com",
}

_AWS_REGIONS: dict[str, str] = {
    "US": "us-east-1",
    "CA": "us-east-1",
    "UK": "eu-west-1",
    "DE": "eu-west-1",
    "FR": "eu-west-1",
    "IT": "eu-west-1",
    "ES": "eu-west-1",
    "JP": "us-west-2",
}

LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token"


# ---------------------------------------------------------------------------
# LWA token cache (process-level singleton)
# ---------------------------------------------------------------------------

@dataclass
class _TokenCache:
    access_token: str = ""
    expires_at: float = 0.0


_token_cache = _TokenCache()
_token_lock = asyncio.Lock()


def is_configured() -> bool:
    """Return True when SP-API credentials are fully set in config."""
    return bool(
        settings.sp_api_refresh_token
        and settings.sp_api_client_id
        and settings.sp_api_client_secret
        and settings.sp_api_aws_access_key
        and settings.sp_api_aws_secret_key
    )


async def _get_lwa_token() -> str:
    """Return a valid LWA access token, refreshing it if needed."""
    async with _token_lock:
        now = time.monotonic()
        # Keep a 30-second safety margin before expiry
        if _token_cache.access_token and now < _token_cache.expires_at - 30:
            return _token_cache.access_token

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                LWA_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": settings.sp_api_refresh_token,
                    "client_id": settings.sp_api_client_id,
                    "client_secret": settings.sp_api_client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data: dict[str, Any] = resp.json()

        _token_cache.access_token = data["access_token"]
        _token_cache.expires_at = now + int(data.get("expires_in", 3600))
        return _token_cache.access_token


# ---------------------------------------------------------------------------
# Signed request helper
# ---------------------------------------------------------------------------

async def sp_request(
    method: str,
    marketplace: str,
    path: str,
    params: dict[str, str] | None = None,
    body: Any = None,
    retries: int = 3,
) -> Any:
    """
    Execute a signed SP-API request.

    Args:
        method:      HTTP verb (GET, POST, DELETE …)
        marketplace: Two-letter marketplace code (US, UK, DE …)
        path:        SP-API resource path, e.g. '/catalog/2022-04-01/items/B08XYZ'
        params:      Query-string parameters
        body:        JSON-serialisable request body (POST / PUT)
        retries:     Max attempts on HTTP 429 throttle responses

    Returns:
        Parsed JSON response dict.

    Raises:
        RuntimeError: When all retry attempts are exhausted on throttling.
        httpx.HTTPStatusError: On non-429 error responses.
    """
    base_url = _BASE_URLS.get(marketplace, _BASE_URLS["US"])
    aws_region = _AWS_REGIONS.get(marketplace, "us-east-1")
    url = f"{base_url}{path}"

    serialised_body = json.dumps(body) if body is not None else ""

    creds = Credentials(
        settings.sp_api_aws_access_key,
        settings.sp_api_aws_secret_key,
    )

    last_exc: Exception | None = None
    for attempt in range(retries):
        access_token = await _get_lwa_token()

        headers: dict[str, str] = {
            "x-amz-access-token": access_token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        # Build a botocore AWSRequest solely for signing; then copy the signed headers
        aws_req = AWSRequest(
            method=method.upper(),
            url=url,
            data=serialised_body or None,
            headers=headers,
            params=params or {},
        )
        SigV4Auth(creds, "execute-api", aws_region).add_auth(aws_req)
        signed_headers = dict(aws_req.headers)

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.request(
                method=method.upper(),
                url=url,
                params=params or {},
                content=serialised_body.encode() if serialised_body else None,
                headers=signed_headers,
            )

        if resp.status_code == 429:
            wait = 2 ** attempt  # 1s, 2s, 4s
            await asyncio.sleep(wait)
            last_exc = RuntimeError(f"SP-API throttled on {path}")
            continue

        resp.raise_for_status()
        return resp.json()

    raise last_exc or RuntimeError(f"SP-API request failed after {retries} retries: {path}")
