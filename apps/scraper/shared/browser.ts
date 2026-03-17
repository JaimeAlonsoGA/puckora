/**
 * shared/browser.ts
 *
 * Browser launch primitive for the scraper suite.
 * USER_AGENTS, VIEWPORTS and pick helpers live in @puckora/scraper-core so
 * they can also be consumed by apps/web for fetch-based scraping.
 *
 * Each scraper builds its own context strategy on top of launchBrowser()
 * (session rotation for Amazon, fresh-context-per-request for GlobalSources).
 */
import { chromium, type Browser } from 'playwright'
export { USER_AGENTS, VIEWPORTS, pickUserAgent, pickViewport } from '@puckora/scraper-core'

export async function launchBrowser(proxyUrl?: string): Promise<Browser> {
    return chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-infobars',
            '--window-size=1920,1080',
            '--disable-features=IsolateOrigins,site-per-process',
        ],
        ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
    })
}
