const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const ROOT = path.resolve(__dirname, '..')
const WEB_ENV_FILE = path.join(ROOT, 'apps/web/.env.local')
const DEFAULT_SQL_INSIGHTS_ROOT = path.join(ROOT, 'temp', 'sql-insights')

function formatStamp(date) {
    return date.toISOString().replace(/[.:]/g, '-').replace('T', '_').replace('Z', '')
}

function slugify(value) {
    return String(value ?? '')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'query'
}

function stripQuotes(value) {
    return value.replace(/^['"]|['"]$/g, '')
}

function readEnvValue(source, key) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = source.match(new RegExp(`^${escapedKey}=(.*)$`, 'm'))
    return match ? stripQuotes(match[1].trim()) : null
}

function loadEnvConfig() {
    if (!fs.existsSync(WEB_ENV_FILE)) {
        throw new Error(`Env file not found: ${WEB_ENV_FILE}`)
    }

    const raw = fs.readFileSync(WEB_ENV_FILE, 'utf8')
    const databaseUrl = readEnvValue(raw, 'DATABASE_URL')
    if (!databaseUrl) {
        throw new Error('DATABASE_URL not found in apps/web/.env.local')
    }

    return {
        databaseUrl,
        databaseProxyUrl: readEnvValue(raw, 'DATABASE_PROXY_URL'),
        supabaseUrl: readEnvValue(raw, 'NEXT_PUBLIC_SUPABASE_URL'),
        supabaseServiceRoleKey: readEnvValue(raw, 'SUPABASE_SERVICE_ROLE_KEY'),
    }
}

function isConnectionRefused(error) {
    return error && typeof error === 'object' && error.code === 'ECONNREFUSED'
}

async function withDatabaseClient(urls, callback) {
    const attempts = urls.filter(Boolean)
    let lastError = null

    for (const connectionString of attempts) {
        const client = new Client({ connectionString, ssl: false, connectionTimeoutMillis: 5000 })
        try {
            await client.connect()
            return await callback(client, connectionString)
        } catch (error) {
            lastError = error
            if (!isConnectionRefused(error)) {
                throw error
            }
        } finally {
            await client.end().catch(() => undefined)
        }
    }

    throw lastError || new Error('No database connection could be established')
}

function toNumericValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value !== 'string' || value.trim() === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function analyzeRows(rows) {
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort()
    const nullCounts = {}
    const numericStats = {}

    for (const column of columns) {
        const values = rows.map((row) => row[column])
        nullCounts[column] = values.filter((value) => value == null).length

        const numericValues = values
            .map(toNumericValue)
            .filter((value) => value != null)

        if (numericValues.length > 0) {
            const sum = numericValues.reduce((total, value) => total + value, 0)
            numericStats[column] = {
                count: numericValues.length,
                min: Math.min(...numericValues),
                max: Math.max(...numericValues),
                avg: Number((sum / numericValues.length).toFixed(2)),
            }
        }
    }

    return {
        row_count: rows.length,
        columns,
        null_counts: nullCounts,
        numeric_stats: numericStats,
        sample_rows: rows.slice(0, 10),
    }
}

function ensureParentDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function buildMarkdownSummary(report) {
    const summary = report.parsed_summary
    const lines = [
        `# SQL Insight: ${report.metadata.name}`,
        '',
        `- Generated: ${report.metadata.generated_at}`,
        `- Connection source: ${report.metadata.connection_source}`,
        `- Query source: ${report.metadata.source}`,
        `- Row count: ${summary.row_count}`,
        '',
        '## Columns',
        '',
    ]

    if (summary.columns.length === 0) {
        lines.push('- None')
    } else {
        for (const column of summary.columns) {
            lines.push(`- ${column}`)
        }
    }

    lines.push('', '## Null Counts', '')
    for (const [column, count] of Object.entries(summary.null_counts)) {
        lines.push(`- ${column}: ${count}`)
    }

    lines.push('', '## Numeric Stats', '')
    const numericStats = Object.entries(summary.numeric_stats)
    if (numericStats.length === 0) {
        lines.push('- None')
    } else {
        for (const [column, stats] of numericStats) {
            lines.push(`- ${column}: count=${stats.count}, min=${stats.min}, max=${stats.max}, avg=${stats.avg}`)
        }
    }

    lines.push('', '## Sample Rows', '')
    if (summary.sample_rows.length === 0) {
        lines.push('- None')
    } else {
        for (const row of summary.sample_rows.slice(0, 5)) {
            lines.push(`- ${JSON.stringify(row)}`)
        }
    }

    lines.push('')
    return `${lines.join('\n')}\n`
}

function resolveOutputTargets(outputArg, name) {
    const outputRoot = outputArg
        ? (path.isAbsolute(outputArg) ? outputArg : path.join(ROOT, outputArg))
        : path.join(DEFAULT_SQL_INSIGHTS_ROOT, formatStamp(new Date()))

    if (outputRoot.endsWith('.json')) {
        return {
            outputDir: path.dirname(outputRoot),
            jsonPath: outputRoot,
            summaryPath: outputRoot.replace(/\.json$/i, '.summary.md'),
        }
    }

    const safeName = slugify(name)
    return {
        outputDir: outputRoot,
        jsonPath: path.join(outputRoot, `${safeName}.json`),
        summaryPath: path.join(outputRoot, `${safeName}.summary.md`),
    }
}

async function runSqlInsight({ name, source, sql, params = [], output }) {
    const envConfig = loadEnvConfig()

    return withDatabaseClient(
        [envConfig.databaseProxyUrl, envConfig.databaseUrl],
        async (client, connectionString) => {
            const startedAt = new Date().toISOString()
            const result = await client.query(sql, params)
            const report = {
                metadata: {
                    generated_at: new Date().toISOString(),
                    started_at: startedAt,
                    name,
                    source,
                    output_file: '',
                    summary_file: '',
                    connection_source: connectionString === envConfig.databaseProxyUrl ? 'DATABASE_PROXY_URL' : 'DATABASE_URL',
                    params,
                },
                sql,
                rowCount: result.rowCount ?? result.rows.length,
                rows: result.rows,
            }

            report.parsed_summary = analyzeRows(report.rows)

            const targets = resolveOutputTargets(output, name)
            report.metadata.output_file = targets.jsonPath
            report.metadata.summary_file = targets.summaryPath

            ensureParentDir(targets.jsonPath)
            fs.writeFileSync(targets.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
            fs.writeFileSync(targets.summaryPath, buildMarkdownSummary(report), 'utf8')

            return { report, targets }
        },
    )
}

module.exports = {
    ROOT,
    DEFAULT_SQL_INSIGHTS_ROOT,
    formatStamp,
    slugify,
    loadEnvConfig,
    withDatabaseClient,
    analyzeRows,
    resolveOutputTargets,
    runSqlInsight,
}