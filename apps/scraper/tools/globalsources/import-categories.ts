/**
 * Puckora — GlobalSources Category Importer
 *
 * Reads the local globalsources-categories.json file and bulk-upserts all
 * leaf categories into the gs_categories table. Safe to re-run — uses
 * ON CONFLICT (url) DO UPDATE so existing rows are refreshed.
 *
 * Run once before the GS scraper (or whenever the categories JSON is updated):
 *   npx tsx tools/globalsources/import-categories.ts
 *   npx tsx tools/globalsources/import-categories.ts --file ./data/custom-categories.json
 *   npx tsx tools/globalsources/import-categories.ts --dry-run
 */
import fs from 'fs'
import path from 'path'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { log } from '../../shared/logger'
dotenv.config()

const BATCH_SIZE = 200

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface CategoryEntry {
    url: string
    name?: string
}

interface CategoryRow {
    url: string
    name: string | null
    slug: string | null
    gs_category_id: string | null
    scrape_status: 'pending'
}

// ─── URL HELPERS ─────────────────────────────────────────────────────────────

function extractSlug(url: string): string | null {
    const m = url.match(/\/category\/([^/?]+)/)
    return m?.[1] ?? null
}

function extractGsCategoryId(slug: string | null): string | null {
    if (!slug) return null
    const m = slug.match(/_(\d+)$/)
    return m?.[1] ?? null
}

// ─── JSON READER ─────────────────────────────────────────────────────────────

function loadCategoriesFromJson(filePath: string): CategoryEntry[] {
    if (!fs.existsSync(filePath)) {
        throw new Error(
            `Categories file not found: ${filePath}\n` +
            'Run: npm run scrape:gs:cats   (tools/globalsources/scrape-categories.ts)',
        )
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    function collectLeaves(nodes: any[]): CategoryEntry[] {
        const result: CategoryEntry[] = []
        for (const node of nodes) {
            const kids: any[] | undefined = node.children ?? node.subcategories
            if (kids && kids.length > 0) {
                result.push(...collectLeaves(kids))
            } else if (node.url) {
                result.push({ url: node.url, name: node.name })
            }
        }
        return result
    }

    if (Array.isArray(raw)) {
        return raw.map((r: any) =>
            typeof r === 'string' ? { url: r } : { url: r.url, name: r.name },
        )
    }

    if (raw && Array.isArray(raw.categories)) {
        return collectLeaves(raw.categories)
    }

    throw new Error('Unexpected categories file format — expected JSON array or { categories: [...] }')
}

// ─── IMPORTER ────────────────────────────────────────────────────────────────

function buildRows(categories: CategoryEntry[]): CategoryRow[] {
    return categories.map(cat => {
        const slug = extractSlug(cat.url)
        return {
            url: cat.url,
            name: cat.name ?? null,
            slug,
            gs_category_id: extractGsCategoryId(slug),
            scrape_status: 'pending' as const,
        }
    })
}

async function importToDb(rows: CategoryRow[], dryRun: boolean): Promise<void> {
    if (dryRun) {
        log.warn('DRY-RUN — first 5 rows:')
        rows.slice(0, 5).forEach(r =>
            console.log(`  [${r.gs_category_id ?? '?'}] ${r.name ?? '—'} | ${r.url}`),
        )
        console.log(`  Would upsert ${rows.length} rows.`)
        return
    }

    if (!process.env['SUPABASE_URL'] || !process.env['SUPABASE_SERVICE_ROLE_KEY']) {
        log.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/scraper/.env')
        process.exit(1)
    }

    const db = createClient(
        process.env['SUPABASE_URL']!,
        process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    )

    let inserted = 0
    let failed = 0

    log.info(`Upserting ${rows.length} rows in batches of ${BATCH_SIZE} …`)

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const { error } = await db
            .from('gs_categories')
            .upsert(batch, { onConflict: 'url', ignoreDuplicates: false })

        if (error) {
            log.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
            failed += batch.length
        } else {
            inserted += batch.length
        }

        process.stdout.write(`\r  Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}   `)
    }

    console.log()
    log.success(`Done — inserted/updated: ${inserted} | failed: ${failed}`)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2)
    const dryRun = args.includes('--dry-run')
    const fileArg = args.find(a => a.startsWith('--file='))?.split('=')[1]
        ?? args[args.indexOf('--file') + 1]
    const filePath = path.resolve(
        fileArg && !fileArg.startsWith('--')
            ? fileArg
            : './data/globalsources-categories.json',
    )

    log.section('Puckora — GlobalSources Category Importer')
    log.info(`Source: ${filePath}`)

    let entries: CategoryEntry[]
    try {
        entries = loadCategoriesFromJson(filePath)
        log.success(`Parsed ${entries.length} leaf categories`)
    } catch (e) {
        log.error((e as Error).message)
        process.exit(1)
    }

    const rows = buildRows(entries)
    await importToDb(rows, dryRun)
}

main().catch(err => {
    log.error(err.message)
    process.exit(1)
})
