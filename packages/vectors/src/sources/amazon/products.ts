import type { Pool } from 'pg'
import type {
    AmazonProductSourceRow,
    AmazonVectorSearchRow,
    VectorSearchResultRow,
    VectorSourceAdapter,
} from '../../types'

export const amazonProductVectorSource: VectorSourceAdapter<AmazonProductSourceRow> = {
    stateKey: 'amazon:product',
    sourceScope: 'amazon',
    documentKind: 'product',
    async fetchBatch(pool, cursor, limit) {
        const hasCursor = Boolean(cursor.cursorUpdatedAt && cursor.cursorDocumentId)
        const query = hasCursor
            ? `
                select
                    p.asin,
                    p.title,
                    p.brand,
                    p.product_type,
                    p.bullet_points,
                    p.price,
                    pf.category_path,
                    p.updated_at::text as updated_at
                from public.amazon_products p
                left join lateral (
                    select category_path
                    from public.product_financials pf
                    where pf.asin = p.asin
                    order by pf.rank asc nulls last
                    limit 1
                ) pf on true
                where p.enriched_at is not null
                  and p.title is not null
                  and (p.updated_at > $1::timestamptz or (p.updated_at = $1::timestamptz and p.asin > $2))
                order by p.updated_at asc, p.asin asc
                limit $3
            `
            : `
                select
                    p.asin,
                    p.title,
                    p.brand,
                    p.product_type,
                    p.bullet_points,
                    p.price,
                    pf.category_path,
                    p.updated_at::text as updated_at
                from public.amazon_products p
                left join lateral (
                    select category_path
                    from public.product_financials pf
                    where pf.asin = p.asin
                    order by pf.rank asc nulls last
                    limit 1
                ) pf on true
                where p.enriched_at is not null
                  and p.title is not null
                order by p.updated_at asc, p.asin asc
                limit $1
            `

        const result = hasCursor
            ? await pool.query<AmazonProductSourceRow>(query, [cursor.cursorUpdatedAt, cursor.cursorDocumentId, limit])
            : await pool.query<AmazonProductSourceRow>(query, [limit])

        return result.rows
    },
    toDocument(row) {
        return {
            sourceScope: 'amazon',
            documentKind: 'product',
            documentId: row.asin,
            label: row.title ?? row.asin,
            rawText: buildAmazonProductEmbeddingText(row),
            metadata: {
                asin: row.asin,
                title: row.title,
                brand: row.brand,
                product_type: row.product_type,
                category_path: row.category_path,
                price: row.price,
            },
            sourceUpdatedAt: row.updated_at,
        }
    },
}

export function buildAmazonProductEmbeddingText(row: AmazonProductSourceRow): string {
    const bulletPoints = row.bullet_points?.filter(Boolean).join('; ') || ''
    return [
        row.title ? `Title: ${row.title}` : '',
        row.product_type ? `Product type: ${row.product_type}` : '',
        row.price != null ? `Price USD: ${row.price}` : '',
        bulletPoints ? `Bullet points: ${bulletPoints}` : '',
    ].filter(Boolean).join('\n')
}

export function mapAmazonProductSearchResult(row: VectorSearchResultRow): AmazonVectorSearchRow {
    const metadata = row.metadata ?? {}
    return {
        asin: readString(metadata['asin']) ?? row.document_id,
        title: readString(metadata['title']) ?? row.label,
        brand: readString(metadata['brand']),
        product_type: readString(metadata['product_type']),
        category_path: readString(metadata['category_path']),
        source_updated_at: row.source_updated_at,
        score: row.score,
    }
}

function readString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null
}