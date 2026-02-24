/**
 * i18n-check.ts  —  i18n Audit Tool
 *
 * Checks for:
 *  1. Missing keys — keys present in `en/` but absent in other locales
 *  2. Orphaned keys — keys present in other locales but not in `en/`
 *  3. Missing namespaces — namespace files present in en/ but absent in a locale
 *  4. Hardcoded strings — JSX text nodes / string props that look like UI copy
 *  5. Unused t() calls — translation keys used in code but absent in en/ files
 *
 * Run:  npm run i18n:check
 * Exit code 1 when issues are found (suitable for CI).
 */

import { readdirSync, readFileSync, existsSync } from 'fs'
import { resolve, join, relative } from 'path'
import glob from 'glob'

const ROOT = resolve(__dirname, '..')
const LOCALES_DIR = resolve(ROOT, 'apps/web/src/locales')
const EN_DIR = resolve(LOCALES_DIR, 'en')
const SRC_DIR = resolve(ROOT, 'apps/web/src')

// ─── Helpers ──────────────────────────────────────────────────────────────────

type JsonObj = Record<string, unknown>

function loadJson(path: string): JsonObj {
    return JSON.parse(readFileSync(path, 'utf-8')) as JsonObj
}

/** Flatten { a: { b: { c: "v" } } } → { "a.b.c": "v" } */
function flattenKeys(obj: JsonObj, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [k, v] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${k}` : k
        if (typeof v === 'object' && v !== null) {
            Object.assign(result, flattenKeys(v as JsonObj, full))
        } else {
            result[full] = String(v)
        }
    }
    return result
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

// ─── Check 1 & 2: Key parity between en and other locales ─────────────────

function checkKeyParity() {
    const namespaces = getNamespaces()
    const locales = getLocales()
    let issues = 0

    for (const locale of locales) {
        for (const ns of namespaces) {
            const enPath = join(EN_DIR, `${ns}.json`)
            const localePath = join(LOCALES_DIR, locale, `${ns}.json`)

            // Check 3: missing namespace file
            if (!existsSync(localePath)) {
                console.warn(`⚠️  [${locale}] Missing namespace file: ${ns}.json`)
                issues++
                continue
            }

            const enKeys = flattenKeys(loadJson(enPath))
            const localeKeys = flattenKeys(loadJson(localePath))

            const enKeySet = new Set(Object.keys(enKeys))
            const localeKeySet = new Set(Object.keys(localeKeys))

            // Missing in locale
            for (const key of enKeySet) {
                if (!localeKeySet.has(key)) {
                    console.warn(`❌  [${locale}/${ns}] Missing key: "${key}"`)
                    issues++
                }
            }

            // Orphaned in locale (extra keys not in en)
            for (const key of localeKeySet) {
                if (!enKeySet.has(key)) {
                    console.warn(`🗑️   [${locale}/${ns}] Orphaned key: "${key}" (not in en/)`)
                    issues++
                }
            }

            // Keys with TODO placeholder
            for (const [key, value] of Object.entries(localeKeys)) {
                if (value.includes('__TODO__')) {
                    console.warn(`📝  [${locale}/${ns}] Untranslated: "${key}" → "${value}"`)
                    // Don't count as error, just warn
                }
            }
        }
    }

    return issues
}

// ─── Check 4: Hardcoded strings in TSX ────────────────────────────────────

const HARDCODED_PATTERNS = [
    // JSX text content that looks like English sentences (3+ words, capitalised)
    />\s*([A-Z][a-z]+(?:\s+[a-z]+){2,})\s*</g,
    // String props that look like UI copy (not className, type, id, href, etc.)
    /(?:label|placeholder|title|description|tooltip|aria-label|alt)=["']([A-Z][^"']{5,})["']/g,
]

async function checkHardcodedStrings() {
    const files = glob.sync('**/*.{tsx,jsx}', { cwd: SRC_DIR, absolute: true })
    const suspects: { file: string; line: number; snippet: string }[] = []

    for (const file of files) {
        const content = readFileSync(file, 'utf-8')
        const lines = content.split('\n')

        lines.forEach((line, i) => {
            // Skip comment lines and import statements
            const trimmed = line.trim()
            if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import')) return

            for (const pattern of HARDCODED_PATTERNS) {
                pattern.lastIndex = 0
                let match
                while ((match = pattern.exec(line)) !== null) {
                    const snippet = match[1]
                    // Skip things that look like code rather than UI copy
                    if (/^[a-z]/.test(snippet)) continue
                    if (snippet.length < 3) continue
                    // Skip if already inside a t() call or Trans component
                    if (line.includes('t(') || line.includes('<Trans')) continue

                    suspects.push({
                        file: relative(ROOT, file),
                        line: i + 1,
                        snippet,
                    })
                }
            }
        })
    }

    return suspects
}

// ─── Check 5: t() calls with keys not in locale files ─────────────────────

async function checkUsedKeys() {
    const namespaces = getNamespaces()
    const enKeys = new Map<string, Set<string>>() // ns → Set<key>

    for (const ns of namespaces) {
        const flat = flattenKeys(loadJson(join(EN_DIR, `${ns}.json`)))
        enKeys.set(ns, new Set(Object.keys(flat)))
    }

    const files = glob.sync('**/*.{ts,tsx}', { cwd: SRC_DIR, absolute: true })
    const missingInLocale: { file: string; line: number; ns: string; key: string }[] = []

    // Match: useT('ns') / useTranslation('ns') then t('key') on same or nearby lines
    // Simpler heuristic: match t('key', { ns: 'xxx' }) or namespace-scoped t('key')
    const callPattern = /\bt\(\s*['"`]([^'"`]+)['"`]/g

    // We'll also detect useT('ns') to know the namespace in scope
    // For simplicity, look for useT imports and cross-reference
    // This is a best-effort heuristic
    const nsPattern = /use(?:T|Translation)\(\s*['"`](\w+)['"`]/g

    for (const file of files) {
        const content = readFileSync(file, 'utf-8')
        // Extract all namespaces used in this file
        const usedNs: string[] = []
        let m
        nsPattern.lastIndex = 0
        while ((m = nsPattern.exec(content)) !== null) {
            usedNs.push(m[1])
        }
        if (usedNs.length === 0) continue

        const lines = content.split('\n')
        lines.forEach((line, i) => {
            callPattern.lastIndex = 0
            while ((m = callPattern.exec(line)) !== null) {
                const key = m[1]
                // Check against all namespaces used in this file
                const allMissing = usedNs.every((ns) => {
                    const keys = enKeys.get(ns)
                    if (!keys) return true
                    // Also check top-level key match
                    return !keys.has(key)
                })

                if (allMissing && !key.includes('{{') && !key.includes(' ')) {
                    missingInLocale.push({
                        file: relative(ROOT, file),
                        line: i + 1,
                        ns: usedNs.join(' | '),
                        key,
                    })
                }
            }
        })
    }

    return missingInLocale
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
    console.log('🔍  i18n Audit\n')

    // 1–3: Key parity
    console.log('── Key parity ──────────────────────────────')
    const parityIssues = checkKeyParity()
    if (parityIssues === 0) console.log('✅  All locale files are in sync\n')
    else console.log('')

    // 4: Hardcoded strings
    console.log('── Potential hardcoded strings ─────────────')
    const suspects = await checkHardcodedStrings()
    if (suspects.length === 0) {
        console.log('✅  No obvious hardcoded strings found\n')
    } else {
        for (const s of suspects.slice(0, 20)) {
            console.warn(`⚠️   ${s.file}:${s.line}  →  "${s.snippet}"`)
        }
        if (suspects.length > 20) console.warn(`   … and ${suspects.length - 20} more`)
        console.log('')
    }

    // 5: Used keys missing from locale files
    console.log('── t() keys missing in en/ ─────────────────')
    const missingKeys = await checkUsedKeys()
    if (missingKeys.length === 0) {
        console.log('✅  All t() keys found in locale files\n')
    } else {
        for (const m of missingKeys.slice(0, 20)) {
            console.warn(`❌  ${m.file}:${m.line}  [${m.ns}] "${m.key}"`)
        }
        if (missingKeys.length > 20) console.warn(`   … and ${missingKeys.length - 20} more`)
        console.log('')
    }

    // Summary
    const totalIssues = parityIssues + missingKeys.length
    if (totalIssues > 0) {
        console.error(`\n🚨  ${totalIssues} issue(s) found. Run \`npm run i18n:sync\` to auto-fix parity issues.`)
        process.exit(1)
    } else {
        console.log(`✨  i18n is clean!`)
    }
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
