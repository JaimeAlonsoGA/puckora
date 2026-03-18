import { queryVectorDocuments } from '../src/runtime'

function parseArgs(argv: string[]) {
    const args = [...argv]
    let scope: string | undefined
    let kind: string | undefined
    let limit: number | undefined
    let minScore: number | undefined
    const queryParts: string[] = []

    while (args.length > 0) {
        const token = args.shift()!
        if (token === '--scope') {
            scope = args.shift()
            continue
        }
        if (token === '--kind') {
            kind = args.shift()
            continue
        }
        if (token === '--limit') {
            limit = Number.parseInt(args.shift() ?? '', 10)
            continue
        }
        if (token === '--min-score') {
            minScore = Number.parseFloat(args.shift() ?? '')
            continue
        }
        queryParts.push(token)
    }

    return {
        scope,
        kind,
        limit: Number.isFinite(limit) ? limit : undefined,
        minScore: Number.isFinite(minScore) ? minScore : undefined,
        query: queryParts.join(' ').trim(),
    }
}

async function main(): Promise<void> {
    const options = parseArgs(process.argv.slice(2))
    if (!options.query) {
        throw new Error('Usage: npm run query -- [--scope amazon] [--kind product] [--limit 10] [--min-score 0.5] "your search text"')
    }

    const rows = await queryVectorDocuments(options.query, options)
    console.table(rows.map((row) => ({
        source_scope: row.source_scope,
        document_kind: row.document_kind,
        document_id: row.document_id,
        label: row.label,
        score: Number(row.score.toFixed(4)),
        source_updated_at: row.source_updated_at,
    })))
}

main().catch((error) => {
    console.error(`[vectors:query] failed: ${(error as Error).message}`)
    process.exit(1)
})