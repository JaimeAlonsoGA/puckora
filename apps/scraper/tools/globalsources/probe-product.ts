/**
 * One-off: scrape a single GS product and dump all fields.
 * Usage: npx tsx tools/globalsources/check-product.ts [url]
 */
import { chromium } from 'playwright'
import { scrapeGsProduct } from '../../scrapers/globalsources/pages/product'
import { launchBrowser } from '../../scrapers/globalsources/browser'

const url = process.argv[2] ??
  'https://www.globalsources.com/product/Compact-integrated-amp-1227760195p.htm'

async function main() {
  const browser = await launchBrowser()
  console.log('scraping:', url)
  const d = await scrapeGsProduct(browser, url)
  await browser.close()

  if (!d) { console.error('no data'); process.exit(1) }

  console.log('\n=== ENRICHED FIELDS ===')
  console.log('key_specifications :', d.key_specifications ? d.key_specifications.slice(0, 200) : 'NULL')
  console.log('export_markets     :', JSON.stringify(d.export_markets))
  console.log('payment_methods    :', JSON.stringify(d.payment_methods))
  console.log('product_info_text  :', d.product_info_text?.slice(0, 150) ?? 'NULL')
  console.log('people_also_search :', JSON.stringify(d.people_also_search.slice(0, 5)))

  console.log('\n=== CORE FIELDS ===')
  console.log('price_low          :', d.price_low)
  console.log('price_unit         :', d.price_unit)
  console.log('moq_quantity       :', d.moq_quantity, d.moq_unit)
  console.log('supplier_name      :', d.supplier_name)
  console.log('fob_port           :', d.fob_port)
  console.log('lead_time          :', d.lead_time_days_min, '-', d.lead_time_days_max, 'days')
  console.log('hts_code           :', d.hts_code)
  console.log('certifications     :', d.certifications)
}

main().catch(err => { console.error(err); process.exit(1) })
