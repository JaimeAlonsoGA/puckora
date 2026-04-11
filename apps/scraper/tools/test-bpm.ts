/**
 * Live test: fetch Amazon keyword search and report bought_past_month coverage.
 * Run with: npx tsx tools/test-bpm.ts
 */
import path from 'path'
import fs from 'fs'
import { parseProducts, parseBoughtPastMonth } from '../../packages/scraper-core/src/parsers/amazon/search'

const KEYWORD = process.argv[2] ?? 'elf ears'
const OUTFILE = '/tmp/amazon-last-response.html'

const HEADERS = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'accept-encoding': 'gzip, deflate, br',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
}

async function fetchPage(url: string): Promise<string> {
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    return res.text()
}

async function main() {
    const url = `https://www.amazon.com/s?k=${encodeURIComponent(KEYWORD)}&ref=nb_sb_noss`
    console.log(`\nFetching: ${url}\n`)

    const html = await fetchPage(url)
    fs.writeFileSync(OUTFILE, html)
    console.log(`HTML size: ${(html.length / 1024).toFixed(0)} KB  (saved to ${OUTFILE})`)

    if (html.length < 5000 || html.toLowerCase().includes('captcha')) {
        console.log('⚠️  CAPTCHA or empty response — saved to', OUTFILE)
        return
    }

    const products = parseProducts(html)
    console.log(`Products parsed: ${products.length}`)

    const withBpm = products.filter(p => p.bought_past_month != null)
    const without = products.filter(p => p.bought_past_month == null)
    console.log(`  with bpm   : ${withBpm.length}/${products.length} (${Math.round(withBpm.length / products.length * 100)}%)`)
    console.log(`  without bpm: ${without.length}/${products.length}\n`)

    console.log('Per-product:')
    for (const p of products) {
        const bpm = p.bought_past_month != null ? `bpm=${p.bought_past_month}` : 'bpm=NULL'
        console.log(`  ${p.asin}  ${bpm.padEnd(12)}  price=${String(p.price ?? '?').padEnd(7)}  ${p.name.slice(0, 50)}`)
    }

    // Also scan raw HTML for any "bought in past month" text we might be missing
    const rawHits = html.match(/[\d,.]+\s*[Kk]\+?\s+bought\s+in\s+(?:the\s+)?past\s+month|[\d,]+\+?\s+bought\s+in\s+(?:the\s+)?past\s+month/gi) ?? []
    console.log(`\nRaw badge text matches in HTML: ${rawHits.length}`)
    rawHits.slice(0, 10).forEach(h => console.log('  ', JSON.stringify(h)))

    if (rawHits.length > withBpm.length) {
        console.log('\n⚠️  MORE raw hits than parsed — parser may be missing some badges')
        // Find a sample of unmatched content around the badge
        const idx = html.search(/[\d,.]+\s*[Kk]\+?\s+bought\s+in\s+(?:the\s+)?past\s+month/i)
        if (idx !== -1) {
            const snippet = html.slice(Math.max(0, idx - 300), idx + 200).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
            console.log('\nContext around first raw hit:\n', snippet)
        }
    }
}

main().catch(e => { console.error(e); process.exit(1) })
