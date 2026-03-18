import type { Pool } from 'pg'
import type { AmazonCategorySourceRow, VectorSourceAdapter } from '../../types'

export const amazonCategoryVectorSource: VectorSourceAdapter<AmazonCategorySourceRow> = {
    stateKey: 'amazon:category',
    sourceScope: 'amazon',
    documentKind: 'category',
    async fetchBatch(pool, cursor, limit) {
        const hasCursor = Boolean(cursor.cursorUpdatedAt && cursor.cursorDocumentId)
        const query = hasCursor
            ? `
                select
                    id,
                    name,
                    breadcrumb,
                    marketplace,
                    coalesce(last_scraped_at, created_at)::text as source_updated_at
                from public.amazon_categories
                where name is not null
                  and (
                    coalesce(last_scraped_at, created_at) > $1::timestamptz
                    or (
                        coalesce(last_scraped_at, created_at) = $1::timestamptz
                        and id > $2
                    )
                  )
                order by coalesce(last_scraped_at, created_at) asc, id asc
                limit $3
            `
            : `
                select
                    id,
                    name,
                    breadcrumb,
                    marketplace,
                    coalesce(last_scraped_at, created_at)::text as source_updated_at
                from public.amazon_categories
                where name is not null
                order by coalesce(last_scraped_at, created_at) asc, id asc
                limit $1
            `

        const result = hasCursor
            ? await pool.query<AmazonCategorySourceRow>(query, [cursor.cursorUpdatedAt, cursor.cursorDocumentId, limit])
            : await pool.query<AmazonCategorySourceRow>(query, [limit])

        return result.rows
    },
    toDocument(row) {
        const breadcrumb = (row.breadcrumb ?? []).filter(Boolean)
        return {
            sourceScope: 'amazon',
            documentKind: 'category',
            documentId: row.id,
            label: row.name,
            rawText: [
                `Category: ${row.name}`,
                breadcrumb.length > 0 ? `Breadcrumb: ${breadcrumb.join(' > ')}` : '',
            ].filter(Boolean).join('\n'),
            metadata: {
                category_id: row.id,
                name: row.name,
                breadcrumb,
                marketplace: row.marketplace,
            },
            sourceUpdatedAt: row.source_updated_at,
        }
    },
}