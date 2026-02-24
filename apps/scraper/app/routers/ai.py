"""
AI router
=========
POST /ai/suggest-products
  - Accepts a freeform prompt describing what kind of product to sell
  - Returns a list of product suggestions with niche rationale
  - Backed by OpenAI GPT-4o-mini (stub falls back gracefully if key not set)

POST /ai/analyze-margin
  - Accepts product cost/price data
  - Returns a margin assessment with rule-based + AI commentary
"""
from __future__ import annotations

import json
import os
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()

# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class SuggestProductsRequest(BaseModel):
    prompt: str
    max_results: int = 5


class ProductSuggestion(BaseModel):
    title: str
    niche: str
    rationale: str
    estimated_margin_pct: float | None = None


class SuggestProductsResponse(BaseModel):
    suggestions: list[ProductSuggestion]
    model: str
    fallback: bool = False


class AnalyzeMarginRequest(BaseModel):
    product_title: str
    unit_cost_usd: float
    sale_price_usd: float
    shipping_cost_usd: float = 0.0
    amazon_fee_pct: float = 15.0


class AnalyzeMarginResponse(BaseModel):
    gross_margin_usd: float
    gross_margin_pct: float
    net_margin_usd: float
    net_margin_pct: float
    assessment: str  # "good" | "marginal" | "poor"
    commentary: str
    model: str
    fallback: bool = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _openai_available() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY"))


async def _call_openai(messages: list[dict], model: str = "gpt-4o-mini") -> str:
    """Call OpenAI chat completions endpoint. Raises if unavailable."""
    import httpx  # local import to keep startup fast when key not set

    api_key = os.environ["OPENAI_API_KEY"]
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 800,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


def _rule_based_suggestions(prompt: str, max_results: int) -> list[ProductSuggestion]:
    """Deterministic fallback when OpenAI is not configured."""
    samples: list[ProductSuggestion] = [
        ProductSuggestion(
            title="Bamboo Kitchen Utensil Set",
            niche="Eco-friendly kitchenware",
            rationale="High demand, low competition, sustainable trend",
            estimated_margin_pct=42.0,
        ),
        ProductSuggestion(
            title="Adjustable Laptop Stand",
            niche="Home office accessories",
            rationale="Remote work growth drives consistent demand",
            estimated_margin_pct=38.0,
        ),
        ProductSuggestion(
            title="Silicone Baking Mat Set",
            niche="Baking & pastry tools",
            rationale="Repeat purchaser segment, gifting appeal",
            estimated_margin_pct=45.0,
        ),
        ProductSuggestion(
            title="Portable Phone Tripod",
            niche="Content creator gear",
            rationale="Creator economy expansion, under $30 impulse buy",
            estimated_margin_pct=50.0,
        ),
        ProductSuggestion(
            title="Reusable Produce Bags",
            niche="Zero-waste lifestyle",
            rationale="Legislation tailwind, bundling opportunity",
            estimated_margin_pct=55.0,
        ),
    ]
    return samples[:max_results]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/suggest-products", response_model=SuggestProductsResponse)
async def suggest_products(
    body: SuggestProductsRequest,
    request: Request,
) -> SuggestProductsResponse:
    """Return AI-generated product suggestions for a given prompt."""

    if not _openai_available():
        return SuggestProductsResponse(
            suggestions=_rule_based_suggestions(body.prompt, body.max_results),
            model="rule-based",
            fallback=True,
        )

    system_msg = (
        "You are an expert Amazon FBA product researcher. "
        "When the user describes what kind of product they want to sell, "
        "respond ONLY with a JSON array of exactly the requested number of product suggestions. "
        "Each item must have: title (string), niche (string), rationale (string), "
        "estimated_margin_pct (number or null). "
        "Output raw JSON only — no markdown fences, no commentary."
    )
    user_msg = (
        f"Suggest {body.max_results} Amazon FBA product ideas for: {body.prompt}"
    )

    try:
        raw = await _call_openai(
            [{"role": "system", "content": system_msg}, {"role": "user", "content": user_msg}]
        )
        items: list[dict[str, Any]] = json.loads(raw)
        suggestions = [ProductSuggestion(**item) for item in items[: body.max_results]]
        return SuggestProductsResponse(
            suggestions=suggestions,
            model="gpt-4o-mini",
            fallback=False,
        )
    except Exception:
        # Graceful degradation — never surface OpenAI errors to the client
        return SuggestProductsResponse(
            suggestions=_rule_based_suggestions(body.prompt, body.max_results),
            model="rule-based",
            fallback=True,
        )


@router.post("/analyze-margin", response_model=AnalyzeMarginResponse)
async def analyze_margin(
    body: AnalyzeMarginRequest,
    request: Request,
) -> AnalyzeMarginResponse:
    """Return a margin breakdown with AI commentary."""

    amazon_fee = body.sale_price_usd * (body.amazon_fee_pct / 100)
    gross_margin_usd = body.sale_price_usd - body.unit_cost_usd
    net_margin_usd = gross_margin_usd - body.shipping_cost_usd - amazon_fee
    gross_pct = (gross_margin_usd / body.sale_price_usd * 100) if body.sale_price_usd else 0
    net_pct = (net_margin_usd / body.sale_price_usd * 100) if body.sale_price_usd else 0

    if net_pct >= 30:
        assessment = "good"
    elif net_pct >= 15:
        assessment = "marginal"
    else:
        assessment = "poor"

    # AI commentary — best-effort
    commentary = _rule_commentary(assessment, net_pct, body.product_title)
    model = "rule-based"

    if _openai_available():
        try:
            prompt = (
                f"Product: {body.product_title}\n"
                f"Unit cost: ${body.unit_cost_usd:.2f}, "
                f"Sale price: ${body.sale_price_usd:.2f}, "
                f"Shipping: ${body.shipping_cost_usd:.2f}, "
                f"Amazon fee: {body.amazon_fee_pct}%\n"
                f"Net margin: {net_pct:.1f}% ({assessment})\n\n"
                "In 2 sentences, give actionable advice to improve or maintain this margin. "
                "Be specific and concise."
            )
            commentary = await _call_openai([{"role": "user", "content": prompt}])
            model = "gpt-4o-mini"
        except Exception:
            pass  # keep rule-based commentary

    return AnalyzeMarginResponse(
        gross_margin_usd=round(gross_margin_usd, 2),
        gross_margin_pct=round(gross_pct, 1),
        net_margin_usd=round(net_margin_usd, 2),
        net_margin_pct=round(net_pct, 1),
        assessment=assessment,
        commentary=commentary,
        model=model,
        fallback=(model == "rule-based"),
    )


def _rule_commentary(assessment: str, net_pct: float, product: str) -> str:
    if assessment == "good":
        return (
            f"Strong margin of {net_pct:.1f}% on {product}. "
            "Consider increasing order quantity to lower unit cost further."
        )
    if assessment == "marginal":
        return (
            f"Margin of {net_pct:.1f}% on {product} is workable but thin. "
            "Negotiate shipping rates or explore a higher-priced bundle."
        )
    return (
        f"Margin of {net_pct:.1f}% on {product} is too low for sustainable FBA. "
        "Renegotiate supplier pricing or raise the sale price before proceeding."
    )
