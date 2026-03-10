import { chromium, type Browser, type BrowserContext, type Page, type BrowserContextOptions } from 'playwright'
import { CONFIG } from './config'

const USER_AGENTS = [
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

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
]

export async function launchBrowser(): Promise<Browser> {
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
    ...(CONFIG.proxy_url ? { proxy: { server: CONFIG.proxy_url } } : {}),
  })
}

/**
 * Context rotation strategy:
 *  - One BrowserContext is shared across scrapes to maintain Amazon session cookies (anti-bot).
 *  - Every CONTEXT_ROTATE_EVERY categories the context is recycled: we snapshot its storageState
 *    (cookies + localStorage), close it to free the V8 heap, then open a fresh context pre-seeded
 *    with that snapshot so Amazon still sees a continuous session.
 *  - On a hard block (CAPTCHA / login wall) we discard the snapshot entirely and do a clean warmup.
 */
const CONTEXT_ROTATE_EVERY = 25

let sharedCtx: BrowserContext | null = null
let savedStorageState: NonNullable<BrowserContextOptions['storageState']> | null = null
let contextPageCount = 0

export async function getSharedContext(browser: Browser): Promise<BrowserContext> {
  if (sharedCtx) return sharedCtx

  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  const vp = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)]

  sharedCtx = await browser.newContext({
    ...(savedStorageState ? { storageState: savedStorageState } : {}),
    userAgent: ua,
    viewport: vp,
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
    // Remove automation signals
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })

    // Spoof plugins (headless Chrome has 0 plugins)
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

    // Spoof languages
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })

      // Spoof window.chrome (absent in headless)
      ; (window as any).chrome = {
        app: { isInstalled: false },
        runtime: {},
        loadTimes: () => ({}),
        csi: () => ({}),
      }

    // Spoof permissions
    const origQuery = window.navigator.permissions?.query.bind(window.navigator.permissions)
    if (origQuery) {
      (window.navigator.permissions as any).query = (params: any) =>
        params.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : origQuery(params)
    }
  })

  // Block fonts and trackers only
  await sharedCtx.route('**/*.{woff,woff2,ttf,otf,eot}', r => r.abort())
  await sharedCtx.route('**/pixel.advertising.amazon.com/**', r => r.abort())

  // Warmup — only needed when we have no saved session state.
  // With a restored storageState the session cookies are already valid.
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
 * Rotate the context when the category threshold is reached.
 * Snapshots the current cookies/localStorage so the new context inherits the Amazon session,
 * then closes the old context to release the V8 heap.
 */
export async function rotateContextIfNeeded(browser: Browser): Promise<void> {
  if (!sharedCtx || contextPageCount < CONTEXT_ROTATE_EVERY) return
  try {
    savedStorageState = await sharedCtx.storageState()
  } catch { /* non-fatal — worst case we lose cookies but don't crash */ }
  await sharedCtx.close().catch(() => { })
  sharedCtx = null
  contextPageCount = 0
}

/**
 * Hard reset — called when Amazon blocks us (CAPTCHA / login wall).
 * Discards the saved session and forces a full warmup on the next context.
 */
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

