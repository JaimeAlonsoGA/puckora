from pydantic import BaseModel, HttpUrl, field_validator


class AmazonSearchParams(BaseModel):
    query: str
    marketplace: str = "US"
    page: int = 1
    min_price: float | None = None
    max_price: float | None = None
    min_reviews: int | None = None
    max_reviews: int | None = None
    min_bsr: int | None = None
    max_bsr: int | None = None


class AmazonProductParams(BaseModel):
    asin: str
    marketplace: str = "US"

    @field_validator("asin")
    @classmethod
    def validate_asin(cls, v: str) -> str:
        if not v or len(v) != 10:
            raise ValueError("ASIN must be exactly 10 characters")
        return v.upper()


class AlibabaSearchParams(BaseModel):
    query: str
    page: int = 1


class SpApiFeeParams(BaseModel):
    asin: str
    marketplace: str = "US"
    price: float | None = None
    weight_kg: float | None = None
    dimensions_cm: dict | None = None


class SpApiCatalogParams(BaseModel):
    asin: str
    marketplace: str = "US"

    @field_validator("asin")
    @classmethod
    def validate_asin(cls, v: str) -> str:
        if not v or len(v) != 10:
            raise ValueError("ASIN must be exactly 10 characters")
        return v.upper()


class SpApiPricingParams(BaseModel):
    asin: str
    marketplace: str = "US"

    @field_validator("asin")
    @classmethod
    def validate_asin(cls, v: str) -> str:
        if not v or len(v) != 10:
            raise ValueError("ASIN must be exactly 10 characters")
        return v.upper()


class SpApiLookupParams(BaseModel):
    """Combined catalog + pricing + fees lookup for a single ASIN."""
    asin: str
    marketplace: str = "US"
    price: float | None = None  # Price context for fee estimation

    @field_validator("asin")
    @classmethod
    def validate_asin(cls, v: str) -> str:
        if not v or len(v) != 10:
            raise ValueError("ASIN must be exactly 10 characters")
        return v.upper()


class SpApiBulkLookupParams(BaseModel):
    """Combined lookup for multiple ASINs."""
    asins: list[str]
    marketplace: str = "US"
    price: float | None = None  # Shared price context; override per-ASIN not supported here

    @field_validator("asins")
    @classmethod
    def validate_asins(cls, v: list[str]) -> list[str]:
        cleaned = [a.strip().upper() for a in v if a.strip()]
        for asin in cleaned:
            if len(asin) != 10:
                raise ValueError(f"Invalid ASIN: {asin!r}")
        if not cleaned:
            raise ValueError("At least one ASIN is required")
        if len(cleaned) > 20:
            raise ValueError("Maximum 20 ASINs per bulk request")
        return cleaned


class CategoryEmbedParams(BaseModel):
    category_id: str
    text: str


class CompetitorAnalyzeParams(BaseModel):
    analysis_id: str
    asin: str
    marketplace: str = "US"
    depth: int = 2
