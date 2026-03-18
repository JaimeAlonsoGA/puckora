#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const ROOT = path.resolve(__dirname, '..')
const WEB_ENV_FILE = path.join(ROOT, 'apps/web/.env.local')
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, 'temp', 'amazon-keyword-debug')
const DEFAULT_DEBUG_KEYWORDS = Object.freeze([
    'Juicer',
    'electric candles',
    'cat toy',
    'boat',
    'lofi girl'
])

function parseArgs(argv) {
    const args = {
        keywords: [],
        defaults: false,
        marketplace: 'US',
        output: null,
    }

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]
        const next = argv[index + 1]

        if (arg === '--keyword' && next) {
            args.keywords.push(next)
            index += 1
            continue
        }

        if (arg === '--defaults') {
            args.defaults = true
            continue
        }

        if (arg === '--marketplace' && next) {
            args.marketplace = next.toUpperCase()
            index += 1
            continue
        }

        if (arg === '--output' && next) {
            args.output = next
            index += 1
            continue
        }

        if (arg === '--help' || arg === '-h') {
            printHelp(0)
        }
    }

    if (args.defaults) {
        args.keywords.push(...DEFAULT_DEBUG_KEYWORDS)
    }

    args.keywords = [...new Set(args.keywords.map((keyword) => keyword.trim()).filter(Boolean))]

    if (args.keywords.length === 0) {
        printHelp(1, 'Missing required --keyword argument or --defaults flag')
    }

    if (!args.output) {
        args.output = path.join(DEFAULT_OUTPUT_ROOT, formatStamp(new Date()))
    }

    return args
}

function printHelp(exitCode, error) {
    if (error) console.error(`Error: ${error}`)
    console.error('Usage: node scripts/export-amazon-keyword-debug.js --keyword <term> [--keyword <term>] [--defaults] [--marketplace US] [--output /path/or/dir]')
    process.exit(exitCode)
}

function formatStamp(date) {
    return date.toISOString().replace(/[.:]/g, '-').replace('T', '_').replace('Z', '')
}

function slugify(value) {
    return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'keyword'
}

function stripQuotes(value) {
    return value.replace(/^['"]|['"]$/g, '')
}

function readEnvValue(source, key) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = source.match(new RegExp(`^${escapedKey}=(.*)$`, 'm'))
    return match ? stripQuotes(match[1].trim()) : null
}

function loadDatabaseUrl() {
    if (!fs.existsSync(WEB_ENV_FILE)) {
        throw new Error(`Env file not found: ${WEB_ENV_FILE}`)
    }

    const raw = fs.readFileSync(WEB_ENV_FILE, 'utf8')
    const databaseUrl = readEnvValue(raw, 'DATABASE_URL')
    if (!databaseUrl) {
        throw new Error('DATABASE_URL not found in apps/web/.env.local')
    }

    const databaseProxyUrl = readEnvValue(raw, 'DATABASE_PROXY_URL')
    const supabaseUrl = readEnvValue(raw, 'NEXT_PUBLIC_SUPABASE_URL')
    const supabaseServiceRoleKey = readEnvValue(raw, 'SUPABASE_SERVICE_ROLE_KEY')
    return { databaseUrl, databaseProxyUrl, supabaseUrl, supabaseServiceRoleKey }
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

async function runNamedQuery(client, name, query, params) {
    const startedAt = new Date().toISOString()
    const result = await client.query(query, params)
    return {
        name,
        startedAt,
        finishedAt: new Date().toISOString(),
        rowCount: result.rowCount ?? result.rows.length,
        rows: result.rows,
    }
}

async function fetchRecentScrapeJobs(envConfig, keyword, marketplace) {
    if (!envConfig.supabaseUrl || !envConfig.supabaseServiceRoleKey) {
        return {
            name: 'recent_scrape_jobs',
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            rowCount: 0,
            rows: [],
            warning: 'Supabase credentials unavailable in apps/web/.env.local',
        }
    }

    const startedAt = new Date().toISOString()
    const requestUrl = new URL('/rest/v1/scrape_jobs', envConfig.supabaseUrl)
    requestUrl.searchParams.set('select', 'id,status,error,created_at,completed_at,executor,target_executor,payload,result')
    requestUrl.searchParams.set('order', 'created_at.desc')
    requestUrl.searchParams.set('limit', '40')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)
    let response

    try {
        response = await fetch(requestUrl, {
            headers: {
                apikey: envConfig.supabaseServiceRoleKey,
                Authorization: `Bearer ${envConfig.supabaseServiceRoleKey}`,
            },
            signal: controller.signal,
        })
    } catch (error) {
        clearTimeout(timeoutId)
        return {
            name: 'recent_scrape_jobs',
            startedAt,
            finishedAt: new Date().toISOString(),
            rowCount: 0,
            rows: [],
            warning: `Supabase request failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        }
    }
    clearTimeout(timeoutId)

    if (!response.ok) {
        return {
            name: 'recent_scrape_jobs',
            startedAt,
            finishedAt: new Date().toISOString(),
            rowCount: 0,
            rows: [],
            warning: `Supabase request failed: ${response.status} ${response.statusText}`,
        }
    }

    const rows = await response.json()
    const filteredRows = (Array.isArray(rows) ? rows : [])
        .filter((job) => {
            const payload = job?.payload ?? {}
            return payload.keyword === keyword && String(payload.marketplace ?? 'US').toUpperCase() === marketplace
        })
        .map((job) => ({
            id: job.id,
            status: job.status,
            error: job.error,
            created_at: job.created_at,
            completed_at: job.completed_at,
            executor: job.executor,
            target_executor: job.target_executor,
            payload: job.payload,
            result_listing_count: Array.isArray(job?.result?.listings) ? job.result.listings.length : null,
        }))

    return {
        name: 'recent_scrape_jobs',
        startedAt,
        finishedAt: new Date().toISOString(),
        rowCount: filteredRows.length,
        rows: filteredRows,
    }
}

function getQuery(report, name) {
    return report.queries.find((query) => query.name === name) ?? null
}

function toNumber(value) {
    if (value == null || value === '') return 0
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : 0
}

function countBy(rows, key) {
    const counts = {}
    for (const row of rows) {
        const value = row?.[key] == null || row[key] === '' ? 'unknown' : String(row[key])
        counts[value] = (counts[value] ?? 0) + 1
    }
    return counts
}

function buildParsedSummary(report) {
    const keywordRow = getQuery(report, 'keyword_row')?.rows?.[0] ?? null
    const coverage = getQuery(report, 'coverage_counts')?.rows?.[0] ?? {}
    const missingFinancials = getQuery(report, 'missing_financials')?.rows ?? []
    const linkedProducts = getQuery(report, 'linked_products')?.rows ?? []
    const categoryDistribution = getQuery(report, 'category_distribution')?.rows ?? []
    const recentScrapeJobs = getQuery(report, 'recent_scrape_jobs')?.rows ?? []
    const financialGaps = getQuery(report, 'financial_gaps')?.rows?.[0] ?? {}

    const linkedCount = toNumber(coverage.linked_count)
    const withPrice = toNumber(coverage.with_price)
    const withCategoryRanks = toNumber(coverage.with_category_ranks)
    const financialRowCount = toNumber(coverage.financial_row_count)
    const withFees = toNumber(coverage.with_fees)
    const missingReasonCounts = countBy(missingFinancials, 'missing_reason')
    const scrapeStatusCounts = countBy(linkedProducts, 'scrape_status')
    const jobStatusCounts = countBy(recentScrapeJobs, 'status')
    const recentJob = recentScrapeJobs[0] ?? null
    const findings = []

    if (linkedCount > 0 && withPrice < linkedCount) {
        findings.push(`${linkedCount - withPrice}/${linkedCount} linked ASINs are missing price, which blocks financial rows immediately.`)
    }

    if (linkedCount > 0 && withCategoryRanks < linkedCount) {
        findings.push(`${linkedCount - withCategoryRanks}/${linkedCount} linked ASINs have no category rank, so product_financials cannot emit rows for them.`)
    }

    if (withPrice > 0 && withFees === 0) {
        findings.push('No linked products have FBA/referral fees yet, so fee enrichment is not landing for this keyword set.')
    }

    if (recentJob?.error) {
        findings.push(`Most recent scrape job reported an error: ${recentJob.error}`)
    }

    return {
        keyword: report.metadata.keyword,
        marketplace: report.metadata.marketplace,
        keyword_id: report.metadata.keyword_id ?? null,
        linked_count: linkedCount,
        product_row_count: toNumber(coverage.product_row_count),
        with_price: withPrice,
        with_rating: toNumber(coverage.with_rating),
        with_review_count: toNumber(coverage.with_review_count),
        with_fees: withFees,
        with_category_ranks: withCategoryRanks,
        financial_row_count: financialRowCount,
        with_monthly_revenue: toNumber(coverage.with_monthly_revenue),
        scrape_status_counts: scrapeStatusCounts,
        missing_reason_counts: missingReasonCounts,
        recent_job_status_counts: jobStatusCounts,
        most_recent_job: recentJob,
        financial_gap_counts: {
            priced_without_fees: toNumber(financialGaps.priced_without_fees),
            priced_without_rank: toNumber(financialGaps.priced_without_rank),
            priced_ranked_without_financial: toNumber(financialGaps.priced_ranked_without_financial),
            scraped_only_rows: toNumber(financialGaps.scraped_only_rows),
            enriched_rows: toNumber(financialGaps.enriched_rows),
        },
        top_categories: categoryDistribution.slice(0, 5),
        findings,
    }
}

function buildMarkdownSummary(report) {
    const summary = report.parsed_summary
    const lines = [
        `# Amazon Keyword Debug: ${summary.keyword} (${summary.marketplace})`,
        '',
        `- Generated: ${report.metadata.generated_at}`,
        `- Connection source: ${report.metadata.connection_source}`,
        `- Keyword row id: ${summary.keyword_id ?? 'not found'}`,
        '',
        '## Coverage',
        '',
        `- Linked ASINs: ${summary.linked_count}`,
        `- Product rows: ${summary.product_row_count}`,
        `- With price: ${summary.with_price}`,
        `- With rating: ${summary.with_rating}`,
        `- With review_count: ${summary.with_review_count}`,
        `- With fees: ${summary.with_fees}`,
        `- With category ranks: ${summary.with_category_ranks}`,
        `- Financial rows: ${summary.financial_row_count}`,
        `- With monthly revenue: ${summary.with_monthly_revenue}`,
        '',
        '## Missing Reasons',
        '',
    ]

    const missingReasons = Object.entries(summary.missing_reason_counts)
    if (missingReasons.length === 0) {
        lines.push('- None')
    } else {
        for (const [reason, count] of missingReasons) {
            lines.push(`- ${reason}: ${count}`)
        }
    }

    lines.push('', '## Scrape Status Counts', '')
    const scrapeStatuses = Object.entries(summary.scrape_status_counts)
    if (scrapeStatuses.length === 0) {
        lines.push('- None')
    } else {
        for (const [status, count] of scrapeStatuses) {
            lines.push(`- ${status}: ${count}`)
        }
    }

    lines.push('', '## Financial Gaps', '')
    for (const [label, count] of Object.entries(summary.financial_gap_counts)) {
        lines.push(`- ${label}: ${count}`)
    }

    lines.push('', '## Top Categories', '')
    if (summary.top_categories.length === 0) {
        lines.push('- None')
    } else {
        for (const category of summary.top_categories) {
            lines.push(`- ${category.category_name ?? category.category_id}: ${category.asin_count} ASINs (best rank ${category.best_rank ?? 'n/a'})`)
        }
    }

    lines.push('', '## Findings', '')
    if (summary.findings.length === 0) {
        lines.push('- No obvious blockers detected from the current dump.')
    } else {
        for (const finding of summary.findings) {
            lines.push(`- ${finding}`)
        }
    }

    lines.push('', '## Recent Jobs', '')
    const jobs = getQuery(report, 'recent_scrape_jobs')?.rows ?? []
    if (jobs.length === 0) {
        lines.push('- None found')
    } else {
        for (const job of jobs.slice(0, 10)) {
            lines.push(`- ${job.created_at}: ${job.status} (${job.id}) listings=${job.result_listing_count ?? 'n/a'}${job.error ? ` error=${job.error}` : ''}`)
        }
    }

    lines.push('')
    return `${lines.join('\n')}\n`
}

function buildBatchMarkdownSummary(reports, outputDir) {
    const lines = [
        '# Amazon Keyword Debug Batch Summary',
        '',
        `- Output directory: ${outputDir}`,
        `- Generated: ${new Date().toISOString()}`,
        '',
        '| Keyword | Linked | Price | Ranks | Financials | Main blocker |',
        '| --- | ---: | ---: | ---: | ---: | --- |',
    ]

    for (const report of reports) {
        const summary = report.parsed_summary
        const topFinding = summary.findings[0] ?? 'No obvious blocker detected'
        lines.push(`| ${summary.keyword} | ${summary.linked_count} | ${summary.with_price} | ${summary.with_category_ranks} | ${summary.financial_row_count} | ${topFinding.replace(/\|/g, '/')} |`)
    }

    lines.push('')
    return `${lines.join('\n')}\n`
}

function resolveOutputTargets(outputArg, keyword, marketplace, totalKeywords) {
    const absoluteOutput = path.isAbsolute(outputArg) ? outputArg : path.join(ROOT, outputArg)
    const multipleKeywords = totalKeywords > 1
    const safeKeyword = slugify(keyword)
    const baseName = `amazon-keyword-debug-${safeKeyword}-${marketplace}`

    if (!multipleKeywords && absoluteOutput.endsWith('.json')) {
        return {
            jsonPath: absoluteOutput,
            summaryPath: absoluteOutput.replace(/\.json$/i, '.summary.md'),
        }
    }

    return {
        jsonPath: path.join(absoluteOutput, `${baseName}.json`),
        summaryPath: path.join(absoluteOutput, `${baseName}.summary.md`),
    }
}

async function collectDebugReport(client, envConfig, options) {
    const params = [options.keyword, options.marketplace]
    const keywordRow = await runNamedQuery(
        client,
        'keyword_row',
        `
            select
                ak.id,
                ak.keyword,
                ak.marketplace,
                ak.total_results,
                ak.unique_brands,
                ak.last_searched_at,
                (
                    select count(*)
                    from amazon_keyword_products akp
                    where akp.keyword_id = ak.id
                ) as linked_asins
            from amazon_keywords ak
            where ak.keyword = $1
              and ak.marketplace = $2
            order by ak.last_searched_at desc
            limit 1
        `,
        params,
    )

    const keywordId = keywordRow.rows[0]?.id ?? null
    if (!keywordId) {
        return {
            metadata: {
                generated_at: new Date().toISOString(),
                keyword: options.keyword,
                marketplace: options.marketplace,
                output_file: options.output,
            },
            queries: [keywordRow, await fetchRecentScrapeJobs(envConfig, options.keyword, options.marketplace)],
        }
    }

    const keywordParams = [keywordId]
    const queries = [keywordRow]

    queries.push(
        await runNamedQuery(
            client,
            'coverage_counts',
            `
                with linked as (
                    select akp.asin
                    from amazon_keyword_products akp
                    where akp.keyword_id = $1
                )
                select
                    count(*) as linked_count,
                    count(ap.asin) as product_row_count,
                    count(*) filter (where ap.price is not null and ap.price > 0) as with_price,
                    count(*) filter (where ap.rating is not null) as with_rating,
                    count(*) filter (where ap.review_count is not null) as with_review_count,
                    count(*) filter (where ap.fba_fee is not null or ap.referral_fee is not null) as with_fees,
                    count(*) filter (
                        where exists (
                            select 1
                            from product_category_ranks pcr
                            where pcr.asin = linked.asin
                        )
                    ) as with_category_ranks,
                    count(pf.asin) as financial_row_count,
                    count(*) filter (where pf.monthly_revenue is not null) as with_monthly_revenue
                from linked
                left join amazon_products ap on ap.asin = linked.asin
                left join product_financials pf on pf.asin = linked.asin
            `,
            keywordParams,
        ),
    )

    queries.push(
        await runNamedQuery(
            client,
            'linked_products',
            `
                with linked as (
                    select akp.asin
                    from amazon_keyword_products akp
                    where akp.keyword_id = $1
                )
                select
                    linked.asin,
                    ap.title,
                    ap.brand,
                    ap.price,
                    ap.rating,
                    ap.review_count,
                    ap.fba_fee,
                    ap.referral_fee,
                    ap.scrape_status,
                    ap.updated_at,
                    exists (
                        select 1
                        from product_category_ranks pcr
                        where pcr.asin = linked.asin
                    ) as has_category_rank,
                    case when pf.asin is not null then true else false end as has_financial_row,
                    pf.rank,
                    pf.category_id,
                    pf.monthly_revenue,
                    pf.monthly_net,
                    pf.confidence
                from linked
                left join amazon_products ap on ap.asin = linked.asin
                left join product_financials pf on pf.asin = linked.asin
                order by ap.updated_at desc nulls last, linked.asin asc
            `,
            keywordParams,
        ),
    )

    queries.push(
        await runNamedQuery(
            client,
            'missing_financials',
            `
                with linked as (
                    select akp.asin
                    from amazon_keyword_products akp
                    where akp.keyword_id = $1
                )
                select
                    linked.asin,
                    ap.title,
                    ap.price,
                    ap.rating,
                    ap.review_count,
                    ap.fba_fee,
                    ap.referral_fee,
                    ap.scrape_status,
                    ap.updated_at,
                    exists (
                        select 1
                        from product_category_ranks pcr
                        where pcr.asin = linked.asin
                    ) as has_category_rank,
                    case
                        when ap.asin is null then 'missing_product_row'
                        when ap.price is null or ap.price <= 0 then 'missing_price'
                        when not exists (
                            select 1
                            from product_category_ranks pcr
                            where pcr.asin = linked.asin
                        ) then 'missing_category_rank'
                        else 'other'
                    end as missing_reason
                from linked
                left join amazon_products ap on ap.asin = linked.asin
                left join product_financials pf on pf.asin = linked.asin
                where pf.asin is null
                order by ap.updated_at desc nulls last, linked.asin asc
            `,
            keywordParams,
        ),
    )

    queries.push(
        await runNamedQuery(
            client,
            'financial_gaps',
            `
                with linked as (
                    select akp.asin
                    from amazon_keyword_products akp
                    where akp.keyword_id = $1
                )
                select
                    count(*) filter (where ap.price is not null and ap.price > 0 and (ap.fba_fee is null or ap.referral_fee is null)) as priced_without_fees,
                    count(*) filter (
                        where ap.price is not null and ap.price > 0 and not exists (
                            select 1
                            from product_category_ranks pcr
                            where pcr.asin = linked.asin
                        )
                    ) as priced_without_rank,
                    count(*) filter (
                        where ap.price is not null and ap.price > 0 and exists (
                            select 1
                            from product_category_ranks pcr
                            where pcr.asin = linked.asin
                        ) and pf.asin is null
                    ) as priced_ranked_without_financial,
                    count(*) filter (where ap.scrape_status = 'scraped') as scraped_only_rows,
                    count(*) filter (where ap.scrape_status = 'enriched') as enriched_rows
                from linked
                left join amazon_products ap on ap.asin = linked.asin
                left join product_financials pf on pf.asin = linked.asin
            `,
            keywordParams,
        ),
    )

    queries.push(
        await runNamedQuery(
            client,
            'category_ranks',
            `
                with linked as (
                    select akp.asin
                    from amazon_keyword_products akp
                    where akp.keyword_id = $1
                )
                select
                    pcr.asin,
                    pcr.category_id,
                    ac.name as category_name,
                    pcr.rank,
                    pcr.rank_type,
                    pcr.observed_at
                from product_category_ranks pcr
                join linked on linked.asin = pcr.asin
                left join amazon_categories ac on ac.id = pcr.category_id
                order by pcr.asin asc, pcr.rank asc nulls last
            `,
            keywordParams,
        ),
    )

    queries.push(
        await runNamedQuery(
            client,
            'category_distribution',
            `
                with linked as (
                    select akp.asin
                    from amazon_keyword_products akp
                    where akp.keyword_id = $1
                )
                select
                    pcr.category_id,
                    ac.name as category_name,
                    count(distinct pcr.asin) as asin_count,
                    min(pcr.rank) as best_rank,
                    round(avg(pcr.rank)::numeric, 2) as avg_rank
                from product_category_ranks pcr
                join linked on linked.asin = pcr.asin
                left join amazon_categories ac on ac.id = pcr.category_id
                group by pcr.category_id, ac.name
                order by asin_count desc, avg_rank asc nulls last, category_name asc nulls last
            `,
            keywordParams,
        ),
    )

    queries.push(await fetchRecentScrapeJobs(envConfig, options.keyword, options.marketplace))

    const report = {
        metadata: {
            generated_at: new Date().toISOString(),
            keyword: options.keyword,
            marketplace: options.marketplace,
            keyword_id: keywordId,
            output_file: options.output,
        },
        queries,
    }

    report.parsed_summary = buildParsedSummary(report)
    return report
}

function ensureParentDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

async function main() {
    const options = parseArgs(process.argv.slice(2))
    const envConfig = loadDatabaseUrl()
    const outputDir = path.isAbsolute(options.output) ? options.output : path.join(ROOT, options.output)
    const writtenReports = []

    await withDatabaseClient(
        [envConfig.databaseProxyUrl, envConfig.databaseUrl],
        async (client, connectionString) => {
            for (const keyword of options.keywords) {
                console.log(`Processing keyword: ${keyword}`)
                const targets = resolveOutputTargets(options.output, keyword, options.marketplace, options.keywords.length)
                const report = await collectDebugReport(client, envConfig, {
                    keyword,
                    marketplace: options.marketplace,
                    output: targets.jsonPath,
                })
                report.metadata.connection_source = connectionString === envConfig.databaseProxyUrl ? 'DATABASE_PROXY_URL' : 'DATABASE_URL'
                report.metadata.summary_file = targets.summaryPath
                ensureParentDir(targets.jsonPath)
                fs.writeFileSync(targets.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
                fs.writeFileSync(targets.summaryPath, buildMarkdownSummary(report), 'utf8')
                writtenReports.push(report)
                console.log(`Wrote debug report to ${targets.jsonPath}`)
                console.log(`Wrote parsed summary to ${targets.summaryPath}`)
            }
        },
    )

    if (writtenReports.length > 1) {
        const batchIndexPath = path.join(outputDir, 'index.json')
        const batchSummaryPath = path.join(outputDir, 'summary.md')
        ensureParentDir(batchIndexPath)
        fs.writeFileSync(batchIndexPath, `${JSON.stringify(writtenReports.map((report) => ({
            keyword: report.metadata.keyword,
            marketplace: report.metadata.marketplace,
            json_file: report.metadata.output_file,
            summary_file: report.metadata.summary_file,
            parsed_summary: report.parsed_summary,
        })), null, 2)}\n`, 'utf8')
        fs.writeFileSync(batchSummaryPath, buildBatchMarkdownSummary(writtenReports, outputDir), 'utf8')
        console.log(`Wrote batch index to ${batchIndexPath}`)
        console.log(`Wrote batch summary to ${batchSummaryPath}`)
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error)
    process.exit(1)
})