/**
 * scrapers/globalsources/browser.ts
 *
 * GlobalSources-specific context factory.
 *
 * GS uses Incapsula anti-bot (not Amazon's proprietary stack), so the session
 * management strategy is different:
 *  - No session-state snapshots or context rotation — Incapsula cookies are
 *    per-request, not long-lived session cookies.
 *  - A short sleep after domcontentloaded is required for the JS challenge to
 *    resolve before any page.evaluate() calls.
 *  - Font/tracker blocking is lighter than Amazon (GS doesn't lazy-load prices
 *    via SPAs that depend on external fonts).
 */
import { type Browser, type BrowserContext, type Page } from 'playwright'
import { launchBrowser as sharedLaunch, pickUserAgent, pickViewport } from '../../shared/browser'
import { GS_CONFIG } from './config'

/** Milliseconds to wait for the Incapsula challenge to resolve. */
export const INCAPSULA_WAIT_MS = 5_000

export async function launchBrowser(): Promise<Browser> {
    return sharedLaunch(GS_CONFIG.proxy_url || undefined)
}

export async function newGsContext(browser: Browser): Promise<{ page: Page; ctx: BrowserContext }> {
    const ctx = await browser.newContext({
        userAgent: pickUserAgent(),
        viewport: pickViewport(),
        locale: 'en-US',
        timezoneId: 'America/New_York',
        extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'sec-ch-ua': '"Chromium";v="133", "Google Chrome";v="133", "Not-A.Brand";v="8"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Upgrade-Insecure-Requests': '1',
        },
    })

    // Polyfill __name (esbuild/tsx inject) before any page.evaluate() runs
    await ctx.addInitScript('window.__name = window.__name || function(fn){ return fn; }')

    await ctx.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })
            ; (window as any).chrome = {
                app: { isInstalled: false },
                runtime: {},
                loadTimes: () => ({}),
                csi: () => ({}),
            }
    })

    // Block fonts only — GS needs most other resources for Incapsula challenge
    await ctx.route('**/*.{woff,woff2,ttf,otf,eot}', r => r.abort())

    const page = await ctx.newPage()
    return { page, ctx }
}

/**
 * Navigate to a URL and wait for the Incapsula challenge to resolve.
 * Returns false if the page appears to still be blocked after the wait.
 */
export async function gsNavigate(page: Page, url: string): Promise<boolean> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForTimeout(INCAPSULA_WAIT_MS)
    await page.waitForLoadState('networkidle').catch(() => { })
    await page.waitForTimeout(1_500)

    const title = await page.title()
    if (
        title.toLowerCase().includes('access denied') ||
        title.toLowerCase().includes('just a moment') ||
        title.toLowerCase().includes('checking your browser')
    ) {
        return false
    }

    return true
}
