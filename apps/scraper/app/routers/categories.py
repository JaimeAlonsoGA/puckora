"""
categories router
=================
GET  /categories/tree?marketplace=US              — root + first-level nodes
GET  /categories/children?parent_id=...&marketplace=US  — children of a node
POST /categories/search                           — semantic category search via embeddings
POST /categories/embed                            — upsert a single category embedding
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

import httpx

from app.core.config import settings
from app.models.requests import CategoryEmbedParams

router = APIRouter()


def _get_service_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.supabase_url,
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        },
        timeout=10.0,
    )


@router.get("/tree")
async def get_category_tree(
    marketplace: str = Query("US"),
    parent_id: str | None = Query(None),
) -> list[dict]:
    """
    Return category nodes for the given marketplace.
    If parent_id is omitted, return root nodes (depth == 0).
    """
    try:
        async with _get_service_client() as client:
            params: dict = {
                "marketplace": f"eq.{marketplace.upper()}",
                "order": "full_path.asc",
                "select": "id,name,parent_id,full_path,breadcrumb,depth,is_leaf,slug,"
                          "referral_fee_pct,closing_fee_usd,avg_bsr,avg_price,"
                          "avg_rating,competition_level,opportunity_score,product_count_est",
            }
            if parent_id:
                params["parent_id"] = f"eq.{parent_id}"
            else:
                params["depth"] = "eq.0"

            resp = await client.get("/rest/v1/amazon_categories", params=params)

        if resp.status_code != 200:
            raise RuntimeError(f"Supabase error: {resp.status_code} {resp.text}")

        return resp.json()

    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/children")
async def get_category_children(
    parent_id: str = Query(...),
    marketplace: str = Query("US"),
) -> list[dict]:
    """Return direct children of a category node."""
    return await get_category_tree(marketplace=marketplace, parent_id=parent_id)


@router.post("/search")
async def search_categories(body: dict) -> list[dict]:
    """
    Semantic category search.
    Body: { query: str, marketplace?: str, limit?: int }

    Generates an embedding for the query text then calls
    match_categories_semantic() Postgres RPC.
    """
    query_text: str = (body.get("query") or "").strip()
    if not query_text:
        raise HTTPException(status_code=422, detail="'query' is required.")

    marketplace: str = (body.get("marketplace") or "US").strip().upper()
    limit: int = int(body.get("limit") or 20)

    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI not configured — semantic search unavailable.")

    try:
        import openai
        oai = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        emb_resp = await oai.embeddings.create(
            model=settings.openai_embedding_model,
            input=query_text,
        )
        embedding = emb_resp.data[0].embedding
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Embedding generation failed: {exc}") from exc

    try:
        async with _get_service_client() as client:
            resp = await client.post(
                "/rest/v1/rpc/match_categories_semantic",
                json={
                    "query_embedding": embedding,
                    "p_marketplace": marketplace,
                    "p_match_count": limit,
                    "p_min_similarity": 0.35,
                },
            )

        if resp.status_code != 200:
            raise RuntimeError(f"RPC error: {resp.status_code} {resp.text}")

        return resp.json()

    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/embed")
async def embed_category(params: CategoryEmbedParams) -> dict:
    """
    Generate and store an embedding for a category node.
    Used by seeding scripts / admin tooling.
    """
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI not configured.")

    try:
        import openai
        oai = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        emb_resp = await oai.embeddings.create(
            model=settings.openai_embedding_model,
            input=params.text,
        )
        embedding = emb_resp.data[0].embedding
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Embedding failed: {exc}") from exc

    try:
        async with _get_service_client() as client:
            resp = await client.post(
                "/rest/v1/rpc/upsert_category_embedding",
                json={"p_category_id": params.category_id, "p_embedding": embedding},
            )

        if resp.status_code not in (200, 204):
            raise RuntimeError(f"Upsert error: {resp.status_code} {resp.text}")

    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"category_id": params.category_id, "status": "embedded"}
