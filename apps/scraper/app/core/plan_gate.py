"""
plan_gate.py
------------
FastAPI dependency factory that enforces per-user plan limits by calling the
`increment_usage_counter` Supabase RPC.  Mirrors the plan keys defined in
packages/types/src/plan.ts.

Usage:
    from app.core.plan_gate import plan_gate

    @router.post("/endpoint", dependencies=[Depends(plan_gate("dailySearches"))])
    async def my_endpoint(...):
        ...
"""
from typing import Literal
from functools import lru_cache

import httpx
from fastapi import Depends, Request, HTTPException

from app.core.config import settings

# ── Plan keys (must match plan.ts PlanLimitKey union) ──────────────────────
PlanLimitKey = Literal[
    "dailySearches",
    "costCalculations",
    "competitorAnalysesPerMonth",
    "savedProducts",
    "savedSuppliers",
]

# Plan caps per tier ─ mirrors packages/types/src/plan.ts
# format: { tier: { key: limit } }  (None = unlimited)
_PLAN_LIMITS: dict[str, dict[str, int | None]] = {
    "free": {
        "dailySearches": 10,
        "costCalculations": 5,
        "competitorAnalysesPerMonth": 1,
        "savedProducts": 10,
        "savedSuppliers": 5,
    },
    "starter": {
        "dailySearches": 100,
        "costCalculations": 50,
        "competitorAnalysesPerMonth": 10,
        "savedProducts": 100,
        "savedSuppliers": 50,
    },
    "pro": {
        "dailySearches": 1000,
        "costCalculations": 500,
        "competitorAnalysesPerMonth": 50,
        "savedProducts": 1000,
        "savedSuppliers": 500,
    },
    "enterprise": {
        "dailySearches": None,
        "costCalculations": None,
        "competitorAnalysesPerMonth": None,
        "savedProducts": None,
        "savedSuppliers": None,
    },
}

_PERIOD_MAP: dict[str, str] = {
    "dailySearches": "daily",
    "costCalculations": "daily",
    "competitorAnalysesPerMonth": "monthly",
    "savedProducts": "total",
    "savedSuppliers": "total",
}


def _get_service_client():
    """Returns a lightweight httpx client configured with the service-role key."""
    return httpx.AsyncClient(
        base_url=settings.supabase_url,
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        },
        timeout=8.0,
    )


def plan_gate(key: PlanLimitKey):
    """
    Returns a FastAPI dependency that:
    1. Reads user_id / user_token from request.state (set by auth middleware).
    2. Calls `increment_usage_counter` RPC — which atomically increments and
       checks the limit; it raises an error when the cap is exceeded.
    3. Raises HTTP 429 if the plan limit is reached.
    """
    async def _dependency(request: Request) -> None:
        user_id: str = getattr(request.state, "user_id", "")
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required.")

        # Service-to-service calls (from edge functions) have already enforced
        # the plan limit — skip duplicate RPC call to avoid double-counting.
        if user_id == "service":
            return

        period = _PERIOD_MAP.get(key, "daily")

        async with _get_service_client() as client:
            resp = await client.post(
                "/rest/v1/rpc/increment_usage_counter",
                json={"p_user_id": user_id, "p_key": key, "p_period": period},
            )

        if resp.status_code == 429 or (
            resp.status_code == 200
            and isinstance(resp.json(), dict)
            and resp.json().get("limit_exceeded")
        ):
            raise HTTPException(
                status_code=429,
                detail=f"Plan limit reached for '{key}'. Upgrade your plan to continue.",
            )

        if resp.status_code not in (200, 204):
            # Non-critical: log but don't block the request
            pass

    return Depends(_dependency)
