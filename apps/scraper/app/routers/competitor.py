"""
competitor router
=================
POST /scrape/amazon/competitor-analyze
  - Enforces competitorAnalysesPerMonth plan limit
  - Creates competitor_analyses row in Supabase
  - Fires background NLP pipeline
  - Returns analysis_id immediately so the frontend can poll
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.core.config import settings
from app.core.plan_gate import plan_gate
from app.models.requests import CompetitorAnalyzeParams
from app.models.competitor import CompetitorAnalysisResult
from app.analysis import review_nlp

router = APIRouter()


def _get_service_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.supabase_url,
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        timeout=8.0,
    )


@router.post(
    "/competitor-analyze",
    response_model=CompetitorAnalysisResult,
    dependencies=[plan_gate("competitorAnalysesPerMonth")],
)
async def competitor_analyze(
    request: Request,
    body: dict,
    background_tasks: BackgroundTasks,
) -> CompetitorAnalysisResult:
    """
    Trigger async competitor analysis.

    Accepted body fields:
      asin        (required)
      marketplace (default: US)
      max_reviews / depth (default: 200)

    Returns immediately with status=pending.
    """
    asin: str = (body.get("asin") or "").strip().upper()
    if not asin or len(asin) != 10:
        raise HTTPException(status_code=422, detail="Invalid or missing ASIN.")

    marketplace: str = (body.get("marketplace") or "US").strip().upper()
    max_reviews: int = int(body.get("max_reviews") or body.get("depth") or 200)
    user_id: str = getattr(request.state, "user_id", "")

    # If the caller (e.g. the edge function) already created the record and
    # passed the UUID, reuse it; otherwise generate one and create the record.
    caller_analysis_id: str | None = body.get("analysis_id") or None

    if caller_analysis_id:
        # Record was already created upstream — skip insert
        analysis_id = caller_analysis_id
    else:
        analysis_id = str(uuid.uuid4())
        # ── Insert pending row into Supabase ────────────────────────────────
        try:
            async with _get_service_client() as client:
                resp = await client.post(
                    "/rest/v1/competitor_analyses",
                    json={
                        "id": analysis_id,
                        "user_id": user_id,
                        "asin": asin,
                        "marketplace": marketplace,
                        "status": "pending",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    },
                )
            if resp.status_code not in (200, 201):
                raise RuntimeError(f"Supabase insert failed: {resp.status_code} {resp.text}")
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Could not create analysis record: {exc}",
            ) from exc

    # ── Queue background NLP pipeline ───────────────────────────────────────
    params = CompetitorAnalyzeParams(
        analysis_id=analysis_id,
        asin=asin,
        marketplace=marketplace,
        depth=max_reviews,
    )
    background_tasks.add_task(review_nlp.run_analysis, params)

    return CompetitorAnalysisResult(
        analysis_id=analysis_id,
        asin=asin,
        marketplace=marketplace,
        status="pending",
    )
