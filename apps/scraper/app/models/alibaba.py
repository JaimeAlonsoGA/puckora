from __future__ import annotations
from pydantic import BaseModel


class PriceRange(BaseModel):
    min: float | None = None
    max: float | None = None
    currency: str = "USD"


class AlibabaSupplierBasic(BaseModel):
    id: str
    name: str
    country: str | None = None
    verified: bool = False
    years_on_platform: int | None = None
    response_rate: float | None = None
    url: str | None = None
    logo_url: str | None = None


class AlibabaProductResult(BaseModel):
    id: str
    title: str
    supplier: AlibabaSupplierBasic
    min_order_quantity: int | None = None
    price_range: PriceRange | None = None
    image_url: str | None = None
    url: str | None = None


class AlibabaSearchResponse(BaseModel):
    query: str
    page: int
    total: int
    results: list[AlibabaProductResult]
