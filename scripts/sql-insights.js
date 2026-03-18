#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { runSqlInsight } = require('./sql-insights-lib')

const PRESETS = {
    'amazon-keyword-products': {
        description: 'All amazon_products linked to a canonical keyword row.',
        params: ['keyword', 'marketplace'],
        buildSql(named) {
            return {
                sql: `
                    select
                        ak.keyword,
                        ak.marketplace,
                        ak.last_searched_at,
                        ap.asin,
                        ap.title,
                        ap.brand,
                        ap.price,
                        ap.rating,
                        ap.review_count,
                        ap.fba_fee,
                        ap.referral_fee,
                        ap.scrape_status,
                        ap.enriched_at,
                        ap.updated_at,
                        case when pf.asin is not null then true else false end as has_financial_row,
                        pf.rank,
                        pf.category_id,
                        pf.monthly_revenue,
                        pf.monthly_net
                    from amazon_products ap
                    join amazon_keyword_products akp on ap.asin = akp.asin
                    join amazon_keywords ak on akp.keyword_id = ak.id
                    left join product_financials pf on pf.asin = ap.asin
                    where ak.keyword = $1
                      and ak.marketplace = $2
                    order by ap.updated_at desc nulls last, ap.asin asc
                `,
                params: [named.keyword, named.marketplace ?? 'US'],
            }
        },
    },
    'amazon-keyword-coverage': {
        description: 'Coverage counts for linked rows, prices, ranks, fees, and financials for a keyword.',
        params: ['keyword', 'marketplace'],
        buildSql(named) {
            return {
                sql: `
                    with keyword_row as (
                        select id
                        from amazon_keywords
                        where keyword = $1 and marketplace = $2
                        order by last_searched_at desc
                        limit 1
                    ), linked as (
                        select akp.asin
                        from amazon_keyword_products akp
                        join keyword_row kr on kr.id = akp.keyword_id
                    )
                    select
                        count(*) as linked_count,
                        count(ap.asin) as product_row_count,
                        count(*) filter (where ap.price is not null and ap.price > 0) as with_price,
                        count(*) filter (where ap.rating is not null) as with_rating,
                        count(*) filter (where ap.review_count is not null) as with_review_count,
                        count(*) filter (where ap.fba_fee is not null or ap.referral_fee is not null) as with_fees,
                        count(*) filter (where exists (select 1 from product_category_ranks pcr where pcr.asin = linked.asin)) as with_category_ranks,
                        count(pf.asin) as financial_row_count,
                        count(*) filter (where pf.monthly_revenue is not null) as with_monthly_revenue
                    from linked
                    left join amazon_products ap on ap.asin = linked.asin
                    left join product_financials pf on pf.asin = linked.asin
                `,
                params: [named.keyword, named.marketplace ?? 'US'],
            }
        },
    },
    'amazon-keyword-missing-financials': {
        description: 'Linked products missing financial rows, including the most likely blocker.',
        params: ['keyword', 'marketplace'],
        buildSql(named) {
            return {
                sql: `
                    with keyword_row as (
                        select id
                        from amazon_keywords
                        where keyword = $1 and marketplace = $2
                        order by last_searched_at desc
                        limit 1
                    ), linked as (
                        select akp.asin
                        from amazon_keyword_products akp
                        join keyword_row kr on kr.id = akp.keyword_id
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
                        ap.enriched_at,
                        exists (select 1 from product_category_ranks pcr where pcr.asin = linked.asin) as has_category_rank,
                        case
                            when ap.asin is null then 'missing_product_row'
                            when ap.price is null or ap.price <= 0 then 'missing_price'
                            when not exists (select 1 from product_category_ranks pcr where pcr.asin = linked.asin) then 'missing_category_rank'
                            else 'other'
                        end as missing_reason
                    from linked
                    left join amazon_products ap on ap.asin = linked.asin
                    left join product_financials pf on pf.asin = linked.asin
                    where pf.asin is null
                    order by ap.updated_at desc nulls last, linked.asin asc
                `,
                params: [named.keyword, named.marketplace ?? 'US'],
            }
        },
    },
}

function printHelp(exitCode, error) {
    if (error) console.error(`Error: ${error}`)
    console.error('Usage: node scripts/sql-insights.js [--query "select ..."] [--file path.sql] [--preset name] [--param key=value] [--params-json "[...]"] [--name label] [--output path] [--list-presets]')
    process.exit(exitCode)
}

function parseArgs(argv) {
    const args = {
        query: null,
        file: null,
        preset: null,
        name: null,
        output: null,
        paramsJson: null,
        namedParams: {},
        listPresets: false,
    }

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]
        const next = argv[index + 1]

        if ((arg === '--query' || arg === '-q') && next) {
            args.query = next
            index += 1
            continue
        }

        if ((arg === '--file' || arg === '-f') && next) {
            args.file = next
            index += 1
            continue
        }

        if ((arg === '--preset' || arg === '-p') && next) {
            args.preset = next
            index += 1
            continue
        }

        if ((arg === '--name' || arg === '-n') && next) {
            args.name = next
            index += 1
            continue
        }

        if ((arg === '--output' || arg === '-o') && next) {
            args.output = next
            index += 1
            continue
        }

        if (arg === '--params-json' && next) {
            args.paramsJson = next
            index += 1
            continue
        }

        if (arg === '--param' && next) {
            const separatorIndex = next.indexOf('=')
            if (separatorIndex === -1) {
                printHelp(1, `Invalid --param value: ${next}`)
            }
            const key = next.slice(0, separatorIndex)
            const value = next.slice(separatorIndex + 1)
            args.namedParams[key] = value
            index += 1
            continue
        }

        if (arg === '--list-presets') {
            args.listPresets = true
            continue
        }

        if (arg === '--help' || arg === '-h') {
            printHelp(0)
        }
    }

    return args
}

function parsePositionalParams(paramsJson) {
    if (!paramsJson) return []
    try {
        const parsed = JSON.parse(paramsJson)
        if (!Array.isArray(parsed)) {
            throw new Error('params-json must be a JSON array')
        }
        return parsed
    } catch (error) {
        throw new Error(`Failed to parse --params-json: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
}

function resolveSqlInput(args) {
    if (args.listPresets) {
        return null
    }

    const modes = [args.query ? 'query' : null, args.file ? 'file' : null, args.preset ? 'preset' : null].filter(Boolean)
    if (modes.length !== 1) {
        printHelp(1, 'Provide exactly one of --query, --file, or --preset')
    }

    if (args.preset) {
        const preset = PRESETS[args.preset]
        if (!preset) {
            printHelp(1, `Unknown preset: ${args.preset}`)
        }
        for (const param of preset.params) {
            if (!args.namedParams[param] && param !== 'marketplace') {
                printHelp(1, `Preset ${args.preset} requires --param ${param}=...`)
            }
        }
        const resolved = preset.buildSql(args.namedParams)
        return {
            name: args.name ?? args.preset,
            source: `preset:${args.preset}`,
            sql: resolved.sql,
            params: resolved.params,
        }
    }

    if (args.file) {
        const filePath = path.isAbsolute(args.file) ? args.file : path.join(process.cwd(), args.file)
        if (!fs.existsSync(filePath)) {
            printHelp(1, `SQL file not found: ${filePath}`)
        }
        return {
            name: args.name ?? path.basename(filePath, path.extname(filePath)),
            source: `file:${filePath}`,
            sql: fs.readFileSync(filePath, 'utf8'),
            params: parsePositionalParams(args.paramsJson),
        }
    }

    return {
        name: args.name ?? 'ad-hoc-query',
        source: 'inline-query',
        sql: args.query,
        params: parsePositionalParams(args.paramsJson),
    }
}

function printPresets() {
    console.log('Available SQL presets:')
    for (const [name, preset] of Object.entries(PRESETS)) {
        console.log(`- ${name}: ${preset.description}`)
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2))
    if (args.listPresets) {
        printPresets()
        return
    }

    const input = resolveSqlInput(args)
    const { report, targets } = await runSqlInsight({
        name: input.name,
        source: input.source,
        sql: input.sql,
        params: input.params,
        output: args.output,
    })

    console.log(`Wrote SQL insight JSON to ${targets.jsonPath}`)
    console.log(`Wrote SQL insight summary to ${targets.summaryPath}`)
    console.log(`Rows returned: ${report.rowCount}`)
}

main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error)
    process.exit(1)
})