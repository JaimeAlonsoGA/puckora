from __future__ import annotations
from pydantic import BaseModel


class ProductSearchResult(BaseModel):
    asin: str
    title: str
    brand: str | None = None
    price: float | None = None
    currency: str = "USD"
    rating: float | None = None
    review_count: int | None = None
    image_url: str | None = None
    url: str | None = None
    bsr: int | None = None
    bsr_category: str | None = None
    monthly_sales_est: int | None = None
    marketplace: str = "US"


class AmazonSearchResponse(BaseModel):
    query: str
    marketplace: str
    page: int
    total: int | None = None
    results: list[ProductSearchResult]


class ReviewItem(BaseModel):
    id: str
    title: str | None = None
    body: str
    rating: int
    date: str | None = None
    verified: bool = False
    helpful_votes: int = 0


class AmazonProductDetail(BaseModel):
    asin: str
    marketplace: str
    title: str
    brand: str | None = None
    description: str | None = None
    bullet_points: list[str] = []
    price: float | None = None
    currency: str = "USD"
    rating: float | None = None
    review_count: int | None = None
    image_urls: list[str] = []
    bsr: int | None = None
    bsr_category: str | None = None
    category_path: str | None = None
    dimensions: dict | None = None
    weight_kg: float | None = None
    seller_count: int | None = None
    fba_seller_count: int | None = None
    monthly_sales_est: int | None = None
    reviews_sample: list[ReviewItem] = []
