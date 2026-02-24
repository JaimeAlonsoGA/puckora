"""
Proxy configuration stub.
Swap with a real rotating-proxy provider (Oxylabs, BrightData, etc.) in production.
"""
import random

from app.core.config import settings

PROXY_LIST: list[str] = []


def get_proxy() -> dict | None:
    if settings.proxy_url:
        return {"server": settings.proxy_url}
    if PROXY_LIST:
        return {"server": random.choice(PROXY_LIST)}
    return None
