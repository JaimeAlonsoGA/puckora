from __future__ import annotations
from pydantic import BaseModel


class PainPointCluster(BaseModel):
    """Matches pain_point_clusters DB table columns exactly."""
    cluster_label: str           # short label e.g. 'Battery life'
    cluster_theme: str           # longer theme e.g. 'Product stops working after short use'
    mention_count: int = 0
    severity_score: float = 0.0  # 0–100
    is_actionable: bool = False
    opportunity_signal: str | None = None
    representative_quotes: list[str] = []
    avg_rating_in_cluster: float | None = None


class OpportunityReport(BaseModel):
    """Matches opportunity_reports DB table columns exactly."""
    market_gap_summary: str | None = None
    suggested_improvements: list[str] = []
    dissatisfaction_rate: float | None = None  # % negative reviews
    opportunity_score: float | None = None      # 0–100
    top_opportunities: list[dict] = []


class CompetitorAnalysisResult(BaseModel):
    analysis_id: str
    asin: str
    marketplace: str
    status: str
    pain_point_clusters: list[PainPointCluster] = []
    opportunity_report: OpportunityReport | None = None
    total_reviews_analyzed: int = 0
    error_message: str | None = None
