import httpx
from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings

# Public paths that skip auth
_PUBLIC_PATHS = ("/health", "/docs", "/openapi.json", "/redoc")


async def api_key_middleware(request: Request, call_next):
    # Always let CORS preflight pass — it has no auth header by design
    if request.method == "OPTIONS":
        return await call_next(request)

    if request.url.path in _PUBLIC_PATHS:
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")

    # ── Service-to-service auth via X-API-Key (used by Supabase Edge Functions)
    api_key_header = request.headers.get("X-API-Key", "")
    if api_key_header:
        if settings.api_key and api_key_header == settings.api_key:
            request.state.user_id = "service"
            request.state.user_email = "service@internal"
            request.state.user_token = api_key_header
            return await call_next(request)
        else:
            return JSONResponse({"error": "Invalid API key"}, status_code=401)

    if not auth_header.startswith("Bearer "):
        return JSONResponse({"error": "Missing Bearer token"}, status_code=401)

    token = auth_header.removeprefix("Bearer ").strip()

    try:
        # Validate JWT via Supabase — also fetches user data for request.state
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_anon_key,
                },
                timeout=5.0,
            )
        if resp.status_code != 200:
            raise ValueError(f"Auth rejected: {resp.status_code}")

        user_data = resp.json()
        # Make user identity available to all downstream route handlers
        request.state.user_id = user_data.get("id", "")
        request.state.user_email = user_data.get("email", "")
        request.state.user_token = token

    except Exception:
        return JSONResponse({"error": "Invalid or expired token"}, status_code=401)

    return await call_next(request)
