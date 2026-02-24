from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Checks .env in cwd (apps/scraper) first, then falls back to repo root
    model_config = SettingsConfigDict(
        env_file=[".env", "../../.env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_key: str = "changeme"
    debug: bool = False
    allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:4173",
        "http://localhost:3000",
    ]

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # OpenAI
    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-small"

    # SP-API
    sp_api_refresh_token: str = ""
    sp_api_client_id: str = ""
    sp_api_client_secret: str = ""
    sp_api_aws_access_key: str = ""
    sp_api_aws_secret_key: str = ""
    sp_api_region: str = "us-east-1"

    # Keepa
    keepa_api_key: str = ""

    # Playwright
    playwright_headless: bool = True
    playwright_pool_size: int = 2

    # Proxy
    proxy_url: str = ""


settings = Settings()
