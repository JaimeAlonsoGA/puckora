import { Pool } from 'pg'
import { getVectorConfig } from '../config'
import { embedTexts } from '../provider'
import type {
    StoredVectorDocument,
    VectorSearchOptions,
    VectorSearchResultRow,
    VectorSourceDocument,
    VectorSourceScope,
} from '../types'

const VECTOR_DB_NAME = 'puckora_vectors'
const VECTOR_TABLE = 'vector_documents'
const VECTOR_INDEX = 'idx_vector_documents_hnsw'

function quoteIdentifier(value: string): string {
    return `"${value.replace(/"/g, '""')}"`
}

function toVectorLiteral(values: number[]): string {
    return `[${values.join(',')}]`
}

export function createSourcePool(): Pool {
    return new Pool({ connectionString: getVectorConfig().sourceDatabaseUrl, ssl: false })
}

export async function createVectorPool(): Promise<Pool> {
    await ensureVectorDatabaseExists()
    const pool = new Pool({ connectionString: getVectorConfig().vectorDatabaseUrl, ssl: false })
    await ensureVectorSchema(pool)
    return pool
}

async function ensureVectorDatabaseExists(): Promise<void> {
    const targetUrl = new URL(getVectorConfig().vectorDatabaseUrl)
    const dbName = targetUrl.pathname.replace(/^\//, '') || VECTOR_DB_NAME
    const adminUrl = new URL(targetUrl.toString())
    adminUrl.pathname = '/postgres'

    const adminPool = new Pool({ connectionString: adminUrl.toString(), ssl: false })
    try {
        const result = await adminPool.query<{ datname: string }>('select datname from pg_database where datname = $1', [dbName])
        if (result.rowCount === 0) {
            await adminPool.query(`create database ${quoteIdentifier(dbName)}`)
        }
    } finally {
        await adminPool.end()
    }
}

export async function ensureVectorSchema(pool: Pool): Promise<void> {
    const cfg = getVectorConfig()
    await pool.query('create extension if not exists vector')
    await pool.query(`
        create table if not exists ${VECTOR_TABLE} (
            source_scope text not null,
            document_kind text not null,
            document_id text not null,
            label text,
            raw_text text not null,
            metadata jsonb not null default '{}'::jsonb,
            source_updated_at timestamptz not null,
            content_hash text not null,
            embedding_provider text not null,
            embedding_model text not null,
            embedding_dimensions integer not null,
            embedding vector(${cfg.dimensions}) not null,
            synced_at timestamptz not null default now(),
            primary key (source_scope, document_kind, document_id)
        )
    `)
    await pool.query(`
        create index if not exists ${VECTOR_INDEX}
        on ${VECTOR_TABLE}
        using hnsw (embedding vector_cosine_ops)
    `)
    await pool.query(`
        create index if not exists idx_vector_documents_scope_kind_updated_at
        on ${VECTOR_TABLE} (source_scope, document_kind, source_updated_at desc)
    `)
}

export async function dropVectorDocuments(pool: Pool): Promise<void> {
    await pool.query(`drop table if exists ${VECTOR_TABLE}`)
}

export async function fetchExistingHashes(
    pool: Pool,
    sourceScope: string,
    documentKind: string,
    documentIds: string[],
): Promise<Map<string, string>> {
    if (documentIds.length === 0) return new Map()
    const result = await pool.query<{ document_id: string; content_hash: string }>(
        `
            select document_id, content_hash
            from ${VECTOR_TABLE}
            where source_scope = $1
              and document_kind = $2
              and document_id = any($3::text[])
        `,
        [sourceScope, documentKind, documentIds],
    )
    return new Map(result.rows.map((row) => [row.document_id, row.content_hash]))
}

export async function upsertVectorDocument(pool: Pool, row: StoredVectorDocument, embedding: number[]): Promise<void> {
    const cfg = getVectorConfig()
    await pool.query(
        `
            insert into ${VECTOR_TABLE} (
                source_scope, document_kind, document_id,
                label, raw_text, metadata, source_updated_at,
                content_hash, embedding_provider, embedding_model,
                embedding_dimensions, embedding, synced_at
            ) values (
                $1, $2, $3,
                $4, $5, $6::jsonb, $7::timestamptz,
                $8, $9, $10,
                $11, $12::vector, now()
            )
            on conflict (source_scope, document_kind, document_id) do update set
                label = excluded.label,
                raw_text = excluded.raw_text,
                metadata = excluded.metadata,
                source_updated_at = excluded.source_updated_at,
                content_hash = excluded.content_hash,
                embedding_provider = excluded.embedding_provider,
                embedding_model = excluded.embedding_model,
                embedding_dimensions = excluded.embedding_dimensions,
                embedding = excluded.embedding,
                synced_at = now()
        `,
        [
            row.sourceScope,
            row.documentKind,
            row.documentId,
            row.label,
            row.rawText,
            JSON.stringify(row.metadata),
            row.sourceUpdatedAt,
            row.contentHash,
            cfg.provider,
            cfg.model,
            cfg.dimensions,
            toVectorLiteral(embedding),
        ],
    )
}

export async function touchVectorDocument(pool: Pool, row: StoredVectorDocument): Promise<void> {
    await pool.query(
        `
            update ${VECTOR_TABLE}
               set label = $4,
                   raw_text = $5,
                   metadata = $6::jsonb,
                   source_updated_at = $7::timestamptz,
                   content_hash = $8,
                   synced_at = now()
             where source_scope = $1
               and document_kind = $2
               and document_id = $3
        `,
        [
            row.sourceScope,
            row.documentKind,
            row.documentId,
            row.label,
            row.rawText,
            JSON.stringify(row.metadata),
            row.sourceUpdatedAt,
            row.contentHash,
        ],
    )
}

export async function searchVectorDocumentsByQuery(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResultRow[]> {
    const [embedding] = await embedTexts([query])
    return searchByEmbeddingLiteral(toVectorLiteral(embedding), options)
}

export async function searchVectorDocumentsByDocument(
    sourceScope: string,
    documentKind: string,
    documentId: string,
    options: VectorSearchOptions = {},
): Promise<VectorSearchResultRow[]> {
    const pool = await createVectorPool()
    try {
        const seed = await pool.query<{ embedding: string }>(
            `
                select embedding::text as embedding
                from ${VECTOR_TABLE}
                where source_scope = $1
                  and document_kind = $2
                  and document_id = $3
                limit 1
            `,
            [sourceScope, documentKind, documentId],
        )
        if (!seed.rows[0]?.embedding) return []

        return searchByEmbeddingLiteral(seed.rows[0].embedding, {
            ...options,
            exclude: {
                sourceScope: sourceScope as VectorSourceScope,
                documentKind,
                documentId,
            },
        })
    } finally {
        await pool.end()
    }
}

async function searchByEmbeddingLiteral(embeddingLiteral: string, options: VectorSearchOptions): Promise<VectorSearchResultRow[]> {
    const pool = await createVectorPool()
    try {
        const limit = options.limit ?? getVectorConfig().queryLimit
        const minScore = options.minScore ?? getVectorConfig().minScore
        const params: Array<number | string | string[]> = [embeddingLiteral, minScore]
        const where = ['1 - (embedding <=> $1::vector) >= $2']
        let nextParam = 3

        if (options.sourceScope) {
            where.push(`source_scope = $${nextParam}`)
            params.push(options.sourceScope)
            nextParam += 1
        }

        if (options.documentKinds && options.documentKinds.length > 0) {
            where.push(`document_kind = any($${nextParam}::text[])`)
            params.push(options.documentKinds)
            nextParam += 1
        }

        if (options.exclude) {
            where.push(`not (source_scope = $${nextParam} and document_kind = $${nextParam + 1} and document_id = $${nextParam + 2})`)
            params.push(options.exclude.sourceScope, options.exclude.documentKind, options.exclude.documentId)
            nextParam += 3
        }

        params.push(limit)
        const result = await pool.query<VectorSearchResultRow>(
            `
                select
                    source_scope,
                    document_kind,
                    document_id,
                    label,
                    metadata,
                    source_updated_at,
                    1 - (embedding <=> $1::vector) as score
                from ${VECTOR_TABLE}
                where ${where.join(' and ')}
                order by embedding <=> $1::vector asc
                limit $${nextParam}
            `,
            params,
        )
        return result.rows
    } finally {
        await pool.end()
    }
}