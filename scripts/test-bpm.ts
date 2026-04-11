import { parseProducts } from '../packages/scraper-core/src/parsers/amazon/search.ts'

const headers = {
  'accept-language': 'en-US,en;q=0.9',
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
}

console.log('Fetching "elf ears" from Amazon...')
const res = await fetch('https://www.amazon.com/s?k=elf+ears', { headers })
console.log('Status:', res.status)
const html = await res.text()
console.log('HTML bytes:', html.length)

const products = parseProducts(html)
console.log(`Parsed: ${products.length} products`)
const withBpm = products.filter(p => p.bought_past_month != null)
console.log(`With bpm: ${withBpm.length}/${products.length}`)
for (const p of products.slice(0, 8)) {
  console.log(`  ${p.asin}: bpm=${p.bought_past_month}, price=${p.price}, name=${p.name.slice(0,50)}`)
}

const bpmHits = html.match(/[\d,.]+\s*[KkM]?\+?\s*bought\s+in\s+(?:the\s+)?past\s+month/gi) ?? []
console.log(`\nRaw "bought in past month" in HTML: ${bpmHits.length}`)
bpmHits.slice(0, 8).forEach((h: string) => console.log(' ', h))
