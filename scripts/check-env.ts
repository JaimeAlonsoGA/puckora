#!/usr/bin/env tsx
/**
 * scripts/check-env.ts
 * Validates that all required environment variables are set.
 * Usage: npx tsx scripts/check-env.ts
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

function loadEnv(filePath: string): Record<string, string> {
    if (!existsSync(filePath)) return {}
    return Object.fromEntries(
        readFileSync(filePath, 'utf-8')
            .split('\n')
            .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
            .map((l) => {
                const idx = l.indexOf('=')
                return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^"|"$/g, '')]
            }),
    )
}

const REQUIRED_VARS: Record<string, string[]> = {
    'Root (.env)': [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_PROJECT_ID',
        'SCRAPER_API_KEY',
        'SCRAPER_SERVICE_URL',
    ],
    'Frontend (apps/web/.env)': [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
    ],
    'Scraper (apps/scraper/.env)': [
        'API_KEY',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'OPENAI_API_KEY',
    ],
}

const ENV_FILES: Record<string, string> = {
    'Root (.env)': resolve(ROOT, '.env'),
    'Frontend (apps/web/.env)': resolve(ROOT, 'apps/web/.env'),
    'Scraper (apps/scraper/.env)': resolve(ROOT, 'apps/scraper/.env'),
}

let hasErrors = false

for (const [label, vars] of Object.entries(REQUIRED_VARS)) {
    const env = loadEnv(ENV_FILES[label])
    const missing = vars.filter((v) => !env[v] || env[v] === '')
    if (missing.length) {
        console.error(`❌ ${label}: missing ${missing.join(', ')}`)
        hasErrors = true
    } else {
        console.log(`✅ ${label}: all required vars set`)
    }
}

if (hasErrors) {
    console.error('\nFix missing vars before deploying.')
    process.exit(1)
} else {
    console.log('\n✅ All environment variables are set.')
}
