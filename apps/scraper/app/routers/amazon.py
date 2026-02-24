"""
amazon router
=============
POST /scrape/amazon/search    — keyword search (plan-gated: dailySearches)
POST /scrape/amazon/product   — product detail (plan-gated: dailySearches)

After a successful product detail scrape, an SP-API enrichment task runs in
the background to fill in authoritative BSR, pricing, and FBA fee data.
"""
from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.core.plan_gate import plan_gate
from app.models.requests import AmazonSearchParams, AmazonProductParams
from app.models.amazon import AmazonSearchResponse, AmazonProductDetail
from app.scrapers import amazon_search, amazon_product
from app.utils.sp_api_enrichment import enrich_product

router = APIRouter()


@router.post(
    "/search",
    response_model=AmazonSearchResponse,
    dependencies=[plan_gate("dailySearches")],
)
async def search_amazon(params: AmazonSearchParams) -> AmazonSearchResponse:
    try:
        return await amazon_search.search(params)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post(
    "/product",
    response_model=AmazonProductDetail,
    dependencies=[plan_gate("dailySearches")],
)
async def get_product_detail(
    params: AmazonProductParams,
    background_tasks: BackgroundTasks,
) -> AmazonProductDetail:
    try:
        detail = await amazon_product.get_detail(params)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Fire SP-API enrichment in background — does not block the response
    background_tasks.add_task(enrich_product, detail)

    return detail
