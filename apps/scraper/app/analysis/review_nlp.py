"""
Competitor analysis — review scraping + pain-point clustering via GPT-4o.

Pipeline
--------
1. Scrape customer reviews from Amazon product page (paginated).
2. If OpenAI is configured:
   a. Send batches of reviews to GPT-4o with a structured JSON prompt.
   b. Parse clusters → PainPointCluster + OpportunityReport.
3. If OpenAI is NOT configured, fall back to keyword-bucket heuristics.
4. Write results to Supabase:
   - UPDATE competitor_analyses  (status, progress counters)
   - INSERT pain_point_clusters  (per cluster row)
   - INSERT opportunity_reports  (single row per analysis)
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from app.core.browser import get_page
from app.core.config import settings
from app.models.amazon import ReviewItem
from app.models.competitor import (
    CompetitorAnalysisResult,
    OpportunityReport,
    PainPointCluster,
)
from app.models.requests import CompetitorAnalyzeParams
from app.utils.parsers import parse_int

MARKETPLACE_DOMAINS: dict[str, str] = {
    "US": "www.amazon.com",
    "UK": "www.amazon.co.uk",
    "DE": "www.amazon.de",
    "FR": "www.amazon.fr",
    "CA": "www.amazon.ca",
    "JP": "www.amazon.co.jp",
}

# ── Keyword-bucket fallback ───────────────────────────────────────────────────

_KEYWORD_BUCKETS: list[tuple[str, str, list[str]]] = [
    ("Quality issues", "Product quality and durability problems",
     ["broke", "cheap", "flimsy", "fell apart", "defective", "poor quality", "cracked", "broken"]),
    ("Sizing / fit", "Product dimensions or sizing do not match expectations",
     ["too small", "too big", "wrong size", "runs small", "runs large", "size chart", "doesn't fit"]),
    ("Shipping & packaging", "Delivery delays or damaged packaging",
     ["late", "delayed", "damaged", "package", "shipping", "didn't arrive", "lost"]),
    ("Unclear instructions", "Missing or confusing assembly / usage guide",
     ["instructions", "manual", "confusing", "hard to assemble", "no guide", "unclear"]),
    ("Poor value", "Product not worth the price paid",
     ["overpriced", "expensive", "not worth", "waste of money", "better for the price", "cheaper"]),
    ("Customer service", "Seller support and return/refund experience",
     ["no response", "ignored", "terrible service", "return", "refund", "customer service"]),
]


def _keyword_clusters(
    reviews: list[ReviewItem],
    total: int,
) -> tuple[list[PainPointCluster], OpportunityReport]:
    clusters: list[PainPointCluster] = []
    for label, theme, keywords in _KEYWORD_BUCKETS:
        matched = [
            r for r in reviews
            if any(kw.lower() in r.body.lower() for kw in keywords)
        ]
        if not matched:
            continue
        avg_rating = sum(r.rating for r in matched) / len(matched)
        severity = min(100.0, len(matched) / max(total, 1) * 200)
        clusters.append(
            PainPointCluster(
                cluster_label=label,
                cluster_theme=theme,
                mention_count=len(matched),
                severity_score=round(severity, 2),
                is_actionable=severity > 10,
                representative_quotes=[r.body[:300] for r in matched[:3]],
                avg_rating_in_cluster=round(avg_rating, 2),
            )
        )

    neg_count = sum(1 for r in reviews if r.rating <= 2)
    dissatisfaction_rate = round(neg_count / max(len(reviews), 1) * 100, 2)

    report = OpportunityReport(
        market_gap_summary="Opportunity identified via keyword analysis of reviews.",
        suggested_improvements=[c.cluster_label for c in clusters[:3]],
        dissatisfaction_rate=dissatisfaction_rate,
        opportunity_score=round(min(100.0, dissatisfaction_rate * 1.2), 2),
        top_opportunities=[
            {"theme": c.cluster_label, "mention_count": c.mention_count}
            for c in sorted(clusters, key=lambda x: x.mention_count, reverse=True)[:5]
        ],
    )
    return clusters, report


# ── GPT-4o analysis ───────────────────────────────────────────────────────────

_GPT_SYSTEM = """
You are a senior product market researcher analysing Amazon customer reviews.
Given a list of reviews (provided as JSON), identify the key pain point clusters
and market opportunities.

Return ONLY valid JSON with this exact structure:
{
  "clusters": [
    {
      "cluster_label": "<short label, max 5 words>",
      "cluster_theme": "<fuller description, max 30 words>",
      "mention_count": <integer>,
      "severity_score": <float 0-100>,
      "is_actionable": <boolean>,
      "opportunity_signal": "<one sentence on how to fix or exploit>",
      "representative_quotes": ["<quote 1>", "<quote 2>", "<quote 3>"],
      "avg_rating_in_cluster": <float 1-5 or null>
    }
  ],
  "opportunity_report": {
    "market_gap_summary": "<two sentence summary of biggest market gap>",
    "suggested_improvements": ["<item 1>", "<item 2>", "<item 3>"],
    "dissatisfaction_rate": <float 0-100>,
    "opportunity_score": <float 0-100>,
    "top_opportunities": [{"theme": "<theme>", "mention_count": <int>}]
  }
}
Return 3-7 clusters. Focus on NEGATIVE reviews (1-3 stars).
""".strip()


async def _gpt_analyze(
    reviews: list[ReviewItem],
    asin: str,
) -> tuple[list[PainPointCluster], OpportunityReport] | None:
    """Call GPT-4o-mini to cluster reviews. Returns None if OpenAI unavailable."""
    try:
        from openai import AsyncOpenAI  # type: ignore
    except ImportError:
        return None

    api_key = getattr(settings, "openai_api_key", None)
    if not api_key:
        return None

    client = AsyncOpenAI(api_key=api_key)

    review_data = [
        {
            "id": r.id,
            "rating": r.rating,
            "title": r.title or "",
            "body": r.body[:500],
            "verified": r.verified,
            "helpful_votes": r.helpful_votes,
        }
        for r in reviews
    ]

    prompt_user = (
        f"ASIN: {asin}\n"
        f"Total reviews in batch: {len(reviews)}\n"
        f"Reviews JSON:\n{json.dumps(review_data, ensure_ascii=False)}"
    )

    try:
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _GPT_SYSTEM},
                {"role": "user", "content": prompt_user},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=4096,
        )
        raw = resp.choices[0].message.content or "{}"
        data = json.loads(raw)
    except Exception as exc:
        print(f"[review_nlp] GPT call failed: {exc}")
        return None

    clusters: list[PainPointCluster] = []
    for c in data.get("clusters", []):
        try:
            clusters.append(
                PainPointCluster(
                    cluster_label=c.get("cluster_label", "Unknown"),
                    cluster_theme=c.get("cluster_theme", ""),
                    mention_count=int(c.get("mention_count", 0)),
                    severity_score=float(c.get("severity_score", 0)),
                    is_actionable=bool(c.get("is_actionable", False)),
                    opportunity_signal=c.get("opportunity_signal"),
                    representative_quotes=c.get("representative_quotes", [])[:5],
                    avg_rating_in_cluster=(
                        float(c["avg_rating_in_cluster"])
                        if c.get("avg_rating_in_cluster") is not None
                        else None
                    ),
                )
            )
        except Exception:
            continue

    or_data = data.get("opportunity_report", {})
    report = OpportunityReport(
        market_gap_summary=or_data.get("market_gap_summary"),
        suggested_improvements=or_data.get("suggested_improvements", []),
        dissatisfaction_rate=(
            float(or_data["dissatisfaction_rate"])
            if or_data.get("dissatisfaction_rate") is not None
            else None
        ),
        opportunity_score=(
            float(or_data["opportunity_score"])
            if or_data.get("opportunity_score") is not None
            else None
        ),
        top_opportunities=or_data.get("top_opportunities", []),
    )

    return clusters, report


# ── Review scraper ────────────────────────────────────────────────────────────

async def _scrape_reviews(
    asin: str,
    marketplace: str,
    max_reviews: int,
    min_rating: int | None,
    max_rating: int | None,
) -> list[ReviewItem]:
    """Scrape Amazon customer reviews (paginated, up to max_reviews)."""
    domain = MARKETPLACE_DOMAINS.get(marketplace, "www.amazon.com")
    reviews: list[ReviewItem] = []

    page_num = 1
    while len(reviews) < max_reviews and page_num <= 10:
        url = (
            f"https://{domain}/product-reviews/{asin}"
            f"?reviewerType=all_reviews&pageNumber={page_num}&sortBy=recent"
        )
        async with get_page() as page:
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
                review_els = await page.query_selector_all("[data-hook='review']")
                if not review_els:
                    break

                for el in review_els:
                    if len(reviews) >= max_reviews:
                        break
                    try:
                        review_id = await el.get_attribute("id") or f"rev_{len(reviews)}"

                        star_el = await el.query_selector(
                            "[data-hook='review-star-rating'] .a-icon-alt"
                        )
                        star_text = (await star_el.inner_text()) if star_el else "3.0"
                        rating = int(float(star_text.split()[0]))

                        if min_rating and rating < min_rating:
                            continue
                        if max_rating and rating > max_rating:
                            continue

                        title_el = await el.query_selector(
                            "[data-hook='review-title'] span:not(.a-icon-alt)"
                        )
                        title = (await title_el.inner_text()).strip() if title_el else None

                        body_el = await el.query_selector("[data-hook='review-body'] span")
                        body = (await body_el.inner_text()).strip() if body_el else ""
                        if not body:
                            continue

                        date_el = await el.query_selector("[data-hook='review-date']")
                        date = (await date_el.inner_text()).strip() if date_el else None

                        verified_el = await el.query_selector("[data-hook='avp-badge']")
                        verified = verified_el is not None

                        helpful_el = await el.query_selector(
                            "[data-hook='helpful-vote-statement']"
                        )
                        helpful_text = (await helpful_el.inner_text()) if helpful_el else "0"
                        helpful_votes = parse_int(helpful_text) or 0

                        reviews.append(
                            ReviewItem(
                                id=review_id,
                                title=title,
                                body=body[:1500],
                                rating=rating,
                                date=date,
                                verified=verified,
                                helpful_votes=helpful_votes,
                            )
                        )
                    except Exception:
                        continue

            except Exception as exc:
                print(f"[review_nlp] Page {page_num} failed: {exc}")
                break

        page_num += 1

    return reviews


# ── DB write-back ─────────────────────────────────────────────────────────────

def _get_supabase():
    from supabase import create_client  # type: ignore
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _write_results(
    analysis_id: str,
    clusters: list[PainPointCluster],
    report: OpportunityReport,
    reviews_scraped: int,
) -> None:
    try:
        sb = _get_supabase()
        now = datetime.now(timezone.utc).isoformat()

        sb.table("competitor_analyses").update({
            "status": "complete",
            "reviews_scraped": reviews_scraped,
            "reviews_clustered": sum(c.mention_count for c in clusters),
            "completed_at": now,
        }).eq("id", analysis_id).execute()

        for cluster in clusters:
            sb.table("pain_point_clusters").insert({
                "analysis_id": analysis_id,
                **cluster.model_dump(),
            }).execute()

        sb.table("opportunity_reports").upsert(
            {"analysis_id": analysis_id, **report.model_dump()},
            on_conflict="analysis_id",
        ).execute()

    except Exception as exc:
        print(f"[review_nlp] DB write-back failed: {exc}")


def _write_failed(analysis_id: str, error: str) -> None:
    try:
        sb = _get_supabase()
        sb.table("competitor_analyses").update({
            "status": "failed",
            "error_message": error[:500],
        }).eq("id", analysis_id).execute()
    except Exception as exc:
        print(f"[review_nlp] Failed status write failed: {exc}")


# ── Public entry point ────────────────────────────────────────────────────────

async def run_analysis(params: CompetitorAnalyzeParams) -> CompetitorAnalysisResult:
    """
    Full review NLP pipeline:
    1. Mark analysis as processing.
    2. Scrape reviews from Amazon product-reviews page.
    3. Analyse with GPT-4o-mini (or keyword fallback if no API key).
    4. Write clusters + opportunity report to Supabase.
    """
    try:
        sb = _get_supabase()
        sb.table("competitor_analyses").update({
            "status": "processing",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", params.analysis_id).execute()
    except Exception as exc:
        print(f"[review_nlp] Could not mark as processing: {exc}")

    max_reviews = getattr(params, "depth", 100) or 100

    try:
        reviews = await _scrape_reviews(
            asin=params.asin,
            marketplace=params.marketplace,
            max_reviews=max_reviews,
            min_rating=None,
            max_rating=None,
        )

        if not reviews:
            raise RuntimeError(f"No reviews found for ASIN {params.asin}")

        gpt_result = await _gpt_analyze(reviews, params.asin)
        if gpt_result:
            clusters, report = gpt_result
        else:
            clusters, report = _keyword_clusters(reviews, len(reviews))

        _write_results(
            analysis_id=params.analysis_id,
            clusters=clusters,
            report=report,
            reviews_scraped=len(reviews),
        )

        return CompetitorAnalysisResult(
            analysis_id=params.analysis_id,
            asin=params.asin,
            marketplace=params.marketplace,
            status="complete",
            pain_point_clusters=clusters,
            opportunity_report=report,
            total_reviews_analyzed=len(reviews),
        )

    except Exception as exc:
        error_msg = str(exc)
        print(f"[review_nlp] Analysis failed: {error_msg}")
        _write_failed(params.analysis_id, error_msg)
        return CompetitorAnalysisResult(
            analysis_id=params.analysis_id,
            asin=params.asin,
            marketplace=params.marketplace,
            status="failed",
            error_message=error_msg,
        )
