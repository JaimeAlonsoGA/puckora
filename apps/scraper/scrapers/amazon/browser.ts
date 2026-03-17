/**
 * scrapers/amazon/browser.ts
 *
 * Amazon-specific context management.
 *
 * Strategy:
 *  - One BrowserContext shared for the full run to maintain Amazon session cookies.
 *  - Every CONTEXT_ROTATE_EVERY categories: snapshot storageState, close context
 *    to free V8 heap, re-open with snapshot so Amazon still sees continuous session.
 *  - Hard block (CAPTCHA / login wall): discard snapshot, force clean warmup.
 */
import { type Browser, type BrowserContext, type Page, type BrowserContextOptions } from 'playwright'
import { launchBrowser as sharedLaunch, pickUserAgent, pickViewport } from '../../shared/browser'
import { AMAZON_CONFIG } from './config'

// ─── Re-export shared launch with Amazon proxy config ────────────────────────

export async function launchBrowser(): Promise<Browser> {
    return sharedLaunch(AMAZON_CONFIG.proxy_url || undefined)
}

// ─── Shared context (session-rotation strategy) ───────────────────────────────

const CONTEXT_ROTATE_EVERY = 25

let sharedCtx: BrowserContext | null = null
let savedStorageState: NonNullable<BrowserContextOptions['storageState']> | null = null
let contextPageCount = 0

export async function getSharedContext(browser: Browser): Promise<BrowserContext> {
    if (sharedCtx) return sharedCtx

    sharedCtx = await browser.newContext({
        ...(savedStorageState ? { storageState: savedStorageState } : {}),
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

    await sharedCtx.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })

        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                const arr = [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', length: 1 },
                    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '', length: 2 },
                ]
                return { ...arr, length: arr.length, item: (i: number) => arr[i], namedItem: (n: string) => arr.find(p => p.name === n) ?? null }
            }
        })

        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })

            ; (window as any).chrome = {
                app: { isInstalled: false },
                runtime: {},
                loadTimes: () => ({}),
                csi: () => ({}),
            }

        const origQuery = window.navigator.permissions?.query.bind(window.navigator.permissions)
        if (origQuery) {
            ; (window.navigator.permissions as any).query = (params: any) =>
                params.name === 'notifications'
                    ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
                    : origQuery(params)
        }
    })

    await sharedCtx.route('**/*.{woff,woff2,ttf,otf,eot}', r => r.abort())
    await sharedCtx.route('**/pixel.advertising.amazon.com/**', r => r.abort())

    if (!savedStorageState) {
        const warmupPage = await sharedCtx.newPage()
        try {
            await warmupPage.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded', timeout: 30_000 })
            await warmupPage.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }))
            await warmupPage.waitForTimeout(1_500 + Math.random() * 1_000)
        } catch { /* non-fatal */ } finally {
            await warmupPage.close()
        }
    }

    return sharedCtx
}

/**
 * Snapshot storageState → close old context → open fresh one pre-seeded with
 * the snapshot. Amazon still sees a continuous session; V8 heap is freed.
 */
export async function rotateContextIfNeeded(browser: Browser): Promise<void> {
    if (!sharedCtx || contextPageCount < CONTEXT_ROTATE_EVERY) return
    try { savedStorageState = await sharedCtx.storageState() } catch { /* non-fatal */ }
    await sharedCtx.close().catch(() => { })
    sharedCtx = null
    contextPageCount = 0
}

/** Discard session — called when Amazon returns a CAPTCHA / login wall. */
export function resetSharedContext(): void {
    if (sharedCtx) { sharedCtx.close().catch(() => { }); sharedCtx = null }
    savedStorageState = null
    contextPageCount = 0
}

export async function newContext(browser: Browser): Promise<{ page: Page; ctx: BrowserContext }> {
    await rotateContextIfNeeded(browser)
    const ctx = await getSharedContext(browser)
    contextPageCount++
    const page = await ctx.newPage()
    return { page, ctx }
}
