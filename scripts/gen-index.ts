import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const INPUT_FILE_PATH = resolve('packages/types/src/database.types.ts')
const OUTPUT_FILE_PATH = resolve('packages/types/src/index.ts')
const IMPORT_PATH = './database.types'

function singularize(name: string): string {
    // Words that should never be singularized
    const noSingularize = new Set([
        'status', 'access', 'process', 'progress', 'address', 'atlas',
        'basis', 'bonus', 'campus', 'focus', 'nexus', 'virus',
    ])
    if (noSingularize.has(name)) return name
    if (name.endsWith('ies')) {
        return name.slice(0, -3) + 'y'
    }
    if (name.endsWith('s') && name.length > 2) {
        return name.slice(0, -1)
    }
    return name
}

function snakeToPascal(snake: string): string {
    return snake
        .split('_')
        .map((word) => {
            const singular = singularize(word)
            return singular.charAt(0).toUpperCase() + singular.slice(1)
        })
        .join('')
}

/** For enums — no singularization, just capitalize each word segment. */
function snakeToPascalEnum(snake: string): string {
    return snake
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
}

function generateTypes(): void {
    let content: string
    try {
        content = readFileSync(INPUT_FILE_PATH, 'utf-8').replace(/^\uFEFF/, '')
    } catch (err) {
        console.error(`❌ Error: Cannot read '${INPUT_FILE_PATH}'`)
        console.error(String(err))
        process.exit(1)
    }

    // Extract table names
    const tablesBlockMatch = content.match(
        /Tables\s*:\s*{([\s\S]*?)}\s*(?:,?\s*(Views|Functions|Enums|CompositeTypes)\s*:|$)/,
    )
    if (!tablesBlockMatch) {
        console.error(`❌ Error: Could not find 'Tables' block in database.types.ts`)
        process.exit(1)
    }

    const tablesBlock = tablesBlockMatch[1]
    const tableNames = [...tablesBlock.matchAll(/^\s*([a-zA-Z0-9_]+)\s*:\s*{\s*Row:/gm)].map(
        (m) => m[1],
    )

    // Extract view names
    const viewsBlockMatch = content.match(
        /Views\s*:\s*{([\s\S]*?)}\s*(?:,?\s*(Functions|Enums|CompositeTypes)\s*:|$)/,
    )
    const viewNames: string[] = []
    if (viewsBlockMatch) {
        const viewsBlock = viewsBlockMatch[1]
        viewNames.push(
            ...[...viewsBlock.matchAll(/^\s*([a-zA-Z0-9_]+)\s*:\s*{\s*Row:/gm)].map((m) => m[1]),
        )
    }

    // Extract enum names + their values from Constants.public.Enums
    // This is the most reliable source — it's a flat array literal per enum.
    const enumNames: string[] = []
    const enumValues: Record<string, string[]> = {}

    const constantsEnumsMatch = content.match(
        /export const Constants\s*=\s*\{[\s\S]*?public\s*:\s*\{[\s\S]*?Enums\s*:\s*\{([\s\S]*?)\}\s*,?\s*\}\s*,?\s*\}/,
    )
    if (constantsEnumsMatch) {
        const block = constantsEnumsMatch[1]
        // Match each entry: enumName: ["val1", "val2", ...] — handles multiline arrays
        const entryRegex = /([a-zA-Z0-9_]+)\s*:\s*\[([\s\S]*?)\]/gm
        for (const match of block.matchAll(entryRegex)) {
            const name = match[1]
            const values = [...match[2].matchAll(/"([^"]*)"/g)].map((m) => m[1])
            if (values.length > 0) {
                enumNames.push(name)
                enumValues[name] = values
            }
        }
    }

    // Fallback: extract from Database["public"]["Enums"] type block (single-line values only)
    if (enumNames.length === 0) {
        const enumsBlockMatch = content.match(
            /Enums\s*:\s*{([\s\S]*?)}\s*(?:,?\s*(CompositeTypes|$)\s*:|$)/,
        )
        if (enumsBlockMatch) {
            const enumsBlock = enumsBlockMatch[1]
            for (const match of enumsBlock.matchAll(
                /^\s*([a-zA-Z0-9_]+)\s*:\s*((?:"[^"]*"\s*\|?\s*)+)/gm,
            )) {
                const name = match[1]
                const values = [...match[2].matchAll(/"([^"]*)"/g)].map((m) => m[1])
                if (values.length > 0) {
                    enumNames.push(name)
                    enumValues[name] = values
                }
            }
        }
    }

    if (tableNames.length === 0 && viewNames.length === 0 && enumNames.length === 0) {
        console.warn('⚠️ No tables or enums found')
        return
    }

    const lines: string[] = [
        `// GENERATED — Do not hand-edit. Run \`npm run gen:types\` to regenerate.\n`,
        `import type { Database } from '${IMPORT_PATH}'`,
        `export type { Database }`,
        `export type { Json } from '${IMPORT_PATH}'`,
        `export * from './meta.types'\n`,
        '// Generic type helpers',
        'type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]',
        'type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]',
        'type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]',
        'type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]',
        'type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"]',
        'export type { Tables, TablesInsert, TablesUpdate, Enums, Views }\n',
    ]

    if (tableNames.length > 0) {
        lines.push('// Tables')
        tableNames.sort().forEach((name) => {
            const pascal = snakeToPascal(name)
            lines.push(`export type ${pascal} = Tables<"${name}">`)
            lines.push(`export type ${pascal}Insert = TablesInsert<"${name}">`)
            lines.push(`export type ${pascal}Update = TablesUpdate<"${name}">`)
            lines.push('')
        })
    }

    if (viewNames.length > 0) {
        lines.push('// Views')
        viewNames.sort().forEach((name) => {
            const pascal = snakeToPascal(name)
            lines.push(`export type ${pascal} = Views<"${name}">`)
        })
        lines.push('')
    }

    // Build a set of already-reserved type names from tables to detect clashes
    const tableTypeNames = new Set(tableNames.map((n) => snakeToPascal(n)))
    const skippedEnumTypes: string[] = []

    if (enumNames.length > 0) {
        lines.push('// Enum types')
        enumNames.sort().forEach((name) => {
            const pascal = snakeToPascalEnum(name)
            if (tableTypeNames.has(pascal)) {
                // Clash: a table type already owns this name (e.g. OnboardingStep from
                // onboarding_steps table vs onboarding_step enum). Skip the alias —
                // callers should use the const `${pascal}Enum` for runtime values and
                // `Enums<"${name}">` when the raw union type is needed.
                skippedEnumTypes.push(name)
                lines.push(`// NOTE: type ${pascal} omitted — name already used by a table type (${name} enum → use Enums<"${name}"> directly)`)
                return
            }
            lines.push(`export type ${pascal} = Enums<"${name}">`)
        })
        lines.push('')

        lines.push('// Enum const objects')
        enumNames.sort().forEach((name) => {
            const pascal = snakeToPascalEnum(name)
            const values = enumValues[name] ?? []
            if (values.length === 0) return
            const entries = values
                .map((v) => `    ${v.toUpperCase().replace(/-/g, '_')}: "${v}"`)
                .join(',\n')
            lines.push(`export const ${pascal}Enum = {`)
            lines.push(entries)
            lines.push(`} as const\n`)
        })

        // EnumNames mapping for i18n utilities
        const enumNamesEntries = enumNames
            .sort()
            .map((name) => {
                const pascal = snakeToPascalEnum(name)
                // camelCase the name for the i18n key value
                const camel = name
                    .split('_')
                    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
                    .join('')
                return `    ${pascal.toUpperCase()}: "${camel}"`
            })
            .join(',\n')
        lines.push(`export const EnumNames = {`)
        lines.push(enumNamesEntries)
        lines.push(`} as const\n`)
    }

    writeFileSync(OUTPUT_FILE_PATH, lines.join('\n'), 'utf-8')

    const summary: string[] = []
    if (tableNames.length > 0) summary.push(`${tableNames.length} table(s)`)
    if (viewNames.length > 0) summary.push(`${viewNames.length} view(s)`)
    if (enumNames.length > 0) summary.push(`${enumNames.length} enum(s)`)
    console.log(`✅ Generated index.ts with ${summary.join(' and ')}`)
    if (skippedEnumTypes.length > 0) {
        console.warn(`⚠️  Skipped enum type aliases (name clash with table type): ${skippedEnumTypes.join(', ')}`)
        console.warn(`   Use Enums<"${skippedEnumTypes[0]}"> when the raw union type is needed.`)
    }
}

generateTypes()
