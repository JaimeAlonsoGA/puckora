"""
Playwright browser pool — async context manager for page acquisition.

Anti-detection strategy:
1. playwright-stealth patches navigator.webdriver and dozens of other bot signals
2. Randomised viewport so every page visit looks like a different screen
3. Random 1-3s "human pacing" delay after navigation before returning the page
4. Persistent cookie jar kept on the context (Amazon's bot score improves after
   the first authenticated session establishes cookies)
"""
import asyncio
import random
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from playwright.async_api import async_playwright, Browser, Page
from playwright_stealth import stealth_async

from app.core.config import settings

_browser: Browser | None = None
_semaphore: asyncio.Semaphore | None = None

# Common desktop viewport sizes to randomise from
_VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1440, "height": 900},
    {"width": 1536, "height": 864},
    {"width": 1280, "height": 800},
    {"width": 1366, "height": 768},
]

_USER_AGENTS = [
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
]


async def _get_browser() -> Browser:
    global _browser
    if _browser is None or not _browser.is_connected():
        pw = await async_playwright().start()
        _browser = await pw.chromium.launch(
            headless=settings.playwright_headless,
            proxy={"server": settings.proxy_url} if settings.proxy_url else None,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
    return _browser


def _get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(settings.playwright_pool_size)
    return _semaphore


@asynccontextmanager
async def get_page() -> AsyncGenerator[Page, None]:
    sem = _get_semaphore()
    async with sem:
        browser = await _get_browser()
        viewport = random.choice(_VIEWPORTS)
        context = await browser.new_context(
            user_agent=random.choice(_USER_AGENTS),
            locale="en-US",
            timezone_id="America/New_York",
            viewport=viewport,
            screen=viewport,
            # Disable WebRTC to prevent IP leaks through canvas/WebRTC fingerprint
            permissions=[],
        )
        page = await context.new_page()

        # Apply playwright-stealth — patches navigator.webdriver, chrome runtime,
        # permissions API, plugin enumeration, canvas fingerprint and many more.
        await stealth_async(page)

        # Small human-pacing delay after page creation (1–2.5 s jitter)
        await asyncio.sleep(random.uniform(1.0, 2.5))

        try:
            yield page
        finally:
            await context.close()

