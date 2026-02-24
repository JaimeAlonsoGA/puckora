/**
 * i18n-sync.ts  —  Locale Sync Tool
 *
 * Keeps all locale files in sync with the English (source-of-truth) locale:
 *
 *  - Adds missing keys as `"__TODO__ <en value>"` so translators know what to fill in
 *  - Removes orphaned keys that no longer exist in en/
 *  - Creates missing namespace files with all keys as TODO
 *  - Preserves the exact key order from the en/ file
 *  - Optionally translates TODO values via Google Translate (pass --translate flag)
 *
 * Run:  npm run i18n:sync
 * Run:  npm run i18n:sync -- --dry-run   (preview changes without writing)
 * Run:  npm run i18n:sync -- --clean     (also remove orphaned keys)
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = resolve(__dirname, '..')
const LOCALES_DIR = resolve(ROOT, 'apps/web/src/locales')
const EN_DIR = resolve(LOCALES_DIR, 'en')

const DRY_RUN = process.argv.includes('--dry-run')
const CLEAN = process.argv.includes('--clean')
const TODO_PREFIX = '__TODO__'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type JsonValue = string | JsonObj | string[]
type JsonObj = { [key: string]: JsonValue }

function loadJson(path: string): JsonObj {
    return JSON.parse(readFileSync(path, 'utf-8')) as JsonObj
}

function saveJson(path: string, data: JsonObj) {
    if (DRY_RUN) {
        console.log(`  [dry-run] Would write ${path}`)
        return
    }
    writeFileSync(path, JSON.stringify(data, null, 4) + '\n', 'utf-8')
}

/**
 * Recursively merge `source` (en) into `target` (other locale).
 *
 * - Keys in source missing from target → added as "__TODO__ <source value>"
 * - Keys in source present in target → kept as-is (preserve translations)
 * - Keys in target missing from source → kept if !CLEAN, removed if CLEAN
 * - Preserves source key order
 */
function syncObject(source: JsonObj, target: JsonObj, path: string): { obj: JsonObj; added: number; removed: number } {
    const result: JsonObj = {}
    let added = 0
    let removed = 0

    for (const key of Object.keys(source)) {
        const sourceVal = source[key]
        const targetVal = target[key]
        const keyPath = path ? `${path}.${key}` : key

        if (typeof sourceVal === 'object' && !Array.isArray(sourceVal) && sourceVal !== null) {
            // Recurse into nested objects
            const nested = syncObject(
                sourceVal as JsonObj,
                typeof targetVal === 'object' && !Array.isArray(targetVal) && targetVal !== null
                    ? (targetVal as JsonObj)
                    : {},
                keyPath,
            )
            result[key] = nested.obj
            added += nested.added
            removed += nested.removed
        } else if (targetVal === undefined) {
            // Key missing in target — add as TODO
            result[key] = `${TODO_PREFIX} ${sourceVal as string}`
            console.log(`  ➕  Added   [${keyPath}]`)
            added++
        } else {
            // Key exists — keep translation as-is
            result[key] = targetVal
        }
    }

    // Handle orphaned keys (exist in target but not in source)
    for (const key of Object.keys(target)) {
        if (!(key in source)) {
            if (CLEAN) {
                console.log(`  🗑️   Removed [${path ? `${path}.${key}` : key}]`)
                removed++
            } else {
                result[key] = target[key]
            }
        }
    }

    return { obj: result, added, removed }
}

function getNamespaces(): string[] {
    return readdirSync(EN_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''))
        .sort()
}

function getLocales(): string[] {
    return readdirSync(LOCALES_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .filter((d) => d !== 'en')
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
    console.log(`🔄  i18n Sync${DRY_RUN ? ' (dry-run)' : ''}${CLEAN ? ' --clean' : ''}\n`)

    const namespaces = getNamespaces()
    const locales = getLocales()

    let totalAdded = 0
    let totalRemoved = 0
    let filesChanged = 0

    for (const locale of locales) {
        const localeDir = join(LOCALES_DIR, locale)

        if (!existsSync(localeDir)) {
            console.log(`📁  Creating directory: ${locale}/`)
            if (!DRY_RUN) mkdirSync(localeDir, { recursive: true })
        }

        for (const ns of namespaces) {
            const enPath = join(EN_DIR, `${ns}.json`)
            const localePath = join(localeDir, `${ns}.json`)

            const enData = loadJson(enPath)
            const localeData = existsSync(localePath) ? loadJson(localePath) : {}

            const { obj: synced, added, removed } = syncObject(enData, localeData, `${locale}/${ns}`)

            if (added > 0 || removed > 0) {
                console.log(`\n📝  ${locale}/${ns}.json  (+${added} −${removed})`)
                saveJson(localePath, synced)
                filesChanged++
                totalAdded += added
                totalRemoved += removed
            }
        }
    }

    console.log('\n' + '─'.repeat(50))
    console.log(`✅  Sync complete: ${filesChanged} file(s) changed`)
    console.log(`   Added   ${totalAdded} TODO placeholder(s)`)
    if (CLEAN) console.log(`   Removed ${totalRemoved} orphaned key(s)`)
    if (totalAdded > 0) {
        console.log(`\n💡  Search for "${TODO_PREFIX}" to find keys that need translating.`)
    }
}

main()
