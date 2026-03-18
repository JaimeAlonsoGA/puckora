import type { Pool } from 'pg'
import type { AmazonKeywordSourceRow, VectorSourceAdapter } from '../../types'

export const amazonKeywordVectorSource: VectorSourceAdapter<AmazonKeywordSourceRow> = {
    stateKey: 'amazon:keyword',
    sourceScope: 'amazon',
    documentKind: 'keyword',
    async fetchBatch(pool, cursor, limit) {
        const hasCursor = Boolean(cursor.cursorUpdatedAt && cursor.cursorDocumentId)
        const query = hasCursor
            ? `
                select
                    id::text as id,
                    keyword,
                    marketplace,
                    last_searched_at::text as last_searched_at
                from public.amazon_keywords
                where keyword is not null
                  and (last_searched_at > $1::timestamptz or (last_searched_at = $1::timestamptz and id::text > $2))
                order by last_searched_at asc, id asc
                limit $3
            `
            : `
                select
                    id::text as id,
                    keyword,
                    marketplace,
                    last_searched_at::text as last_searched_at
                from public.amazon_keywords
                where keyword is not null
                order by last_searched_at asc, id asc
                limit $1
            `

        const result = hasCursor
            ? await pool.query<AmazonKeywordSourceRow>(query, [cursor.cursorUpdatedAt, cursor.cursorDocumentId, limit])
            : await pool.query<AmazonKeywordSourceRow>(query, [limit])

        return result.rows
    },
    toDocument(row) {
        return {
            sourceScope: 'amazon',
            documentKind: 'keyword',
            documentId: row.id,
            label: row.keyword,
            rawText: `Keyword: ${row.keyword}`,
            metadata: {
                keyword_id: row.id,
                keyword: row.keyword,
                marketplace: row.marketplace,
            },
            sourceUpdatedAt: row.last_searched_at,
        }
    },
}