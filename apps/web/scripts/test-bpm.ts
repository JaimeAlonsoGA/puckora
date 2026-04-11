/**
 * Live test: check Amazon "bought in past month" coverage for keyword search.
 * Run: npx tsx scripts/test-bpm.ts [keyword]
 */
import fs from 'fs'
import { parseProducts, parseBoughtPastMonth } from '@puckora/scraper-core'

const KEYWORD = process.argv[2] ?? 'elf ears'

const HEADERS: Record<string, string> = {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
}

async function main() {
    const url = `https://www.amazon.com/s?k=${encodeURIComponent(KEYWORD)}`
    console.log(`\nFetching: ${url}`)
    const res = await fetch(url, { headers: HEADERS })
    console.log(`Status: ${res.status}`)
    const html = await res.text()
    fs.writeFileSync('/tmp/amazon-search.html', html)
    console.log(`HTML: ${(html.length / 1024).toFixed(0)} KB (saved to /tmp/amazon-search.html)`)

    if (html.length < 5000 || /captcha/i.test(html)) {
        console.log('⚠️  CAPTCHA detected')
        return
    }

    const products = parseProducts(html)
    console.log(`Products: ${products.length}`)
    const withBpm = products.filter(p => p.bought_past_month != null)
    console.log(`  With bpm: ${withBpm.length}/${products.length} (${Math.round(withBpm.length / products.length * 100)}%)`)
    console.log()
    console.log('ASIN'.padEnd(12), 'BPM'.padEnd(8), 'Price'.padEnd(8), 'Name (first 50 chars)')
    console.log('-'.repeat(90))
    for (const p of products) {
        const bpm = p.bought_past_month != null ? String(p.bought_past_month) : 'NULL'
        console.log(p.asin.padEnd(12), bpm.padEnd(8), String(p.price ?? '?').padEnd(8), p.name.slice(0, 50))
    }

    const rawHits = html.match(/[\d,.]+\s*[Kk]\+?\s+bought\s+in\s+(?:the\s+)?past\s+month|[\d,]+\+?\s+bought\s+in\s+(?:the\s+)?past\s+month/gi) ?? []
    console.log(`\nRaw "bought in past month" badge text in HTML: ${rawHits.length}`)
    rawHits.slice(0, 10).forEach(h => console.log('  ', JSON.stringify(h)))

    if (rawHits.length > withBpm.length) {
        console.log('\n⚠️  MORE raw hits than parsed products with bpm — parser regex may be missing some')
        // Find context around first unmatched hit
        for (const hit of rawHits) {
            const hitIdx = html.indexOf(hit)
            const context = html.slice(Math.max(0, hitIdx - 500), hitIdx + 200)
            // Extract the containing product block
            const asinMatch = context.match(/data-asin="([A-Z0-9]{10})"/)
            const asin = asinMatch?.[1] ?? 'unknown'
            const parsed = products.find(p => p.asin === asin)
            if (parsed?.bought_past_month == null) {
                console.log(`\n  ASIN ${asin} has raw badge "${hit}" but parsed bpm=null`)
                const cleanCtx = context.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
                console.log('  Context:', cleanCtx.slice(0, 200))
            }
        }
    }
}

main().catch(e => { console.error(e); process.exit(1) })
