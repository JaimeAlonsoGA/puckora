/**
 * @puckora/scraper-core — browser constants
 *
 * User-agent pool and viewport pool used across all scrapers and by any
 * web-app fetch that needs to mimic a real browser request.
 *
 * Intentionally has zero runtime dependencies — no Playwright, no Node.js
 * builtins — so it is safe to import in browser contexts (extension, web).
 */

// ─── USER AGENTS ─────────────────────────────────────────────────────────────

export const USER_AGENTS = [
    // Chrome 133 — Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    // Chrome 133 — macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    // Chrome 132 — Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    // Firefox 134 — Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
    // Safari 18 — macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
]

// ─── VIEWPORTS ───────────────────────────────────────────────────────────────

export const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export const pickUserAgent = (): string =>
    USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

export const pickViewport = (): { width: number; height: number } =>
    VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)]
