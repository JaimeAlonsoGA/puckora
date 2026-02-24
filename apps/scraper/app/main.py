"""
Silkflow Scraper Service — FastAPI entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.auth import api_key_middleware
from app.routers import amazon, alibaba, sp_api, categories, competitor, ai

app = FastAPI(
    title="Silkflow Scraper",
    version="0.1.0",
    docs_url="/docs" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

app.middleware("http")(api_key_middleware)

app.include_router(amazon.router, prefix="/scrape/amazon", tags=["amazon"])
app.include_router(alibaba.router, prefix="/scrape/alibaba", tags=["alibaba"])
app.include_router(sp_api.router, prefix="/sp-api", tags=["sp-api"])
app.include_router(categories.router, prefix="/categories", tags=["categories"])
app.include_router(competitor.router, prefix="/scrape/amazon", tags=["competitor"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
