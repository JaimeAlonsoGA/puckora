import type { Pool } from 'pg'

export type EmbeddingProvider = 'ollama' | 'openai'
export type VectorSourceScope = 'amazon'

export interface VectorConfig {
    sourceDatabaseUrl: string
    vectorDatabaseUrl: string
    provider: EmbeddingProvider
    model: string
    dimensions: number
    ollamaBaseUrl: string
    syncBatchSize: number
    syncPollMs: number
    openAiBatchSize: number
    openAiBatchPollMs: number
    openAiBatchStateFile: string
    minScore: number
    queryLimit: number
    stateFile: string
}

export interface PendingVectorBatchState {
    provider: 'openai'
    batchId: string
    inputFileId: string
    sourceStateKey: string
    sourceScope: VectorSourceScope
    documentKind: string
    nextCursor: SourceSyncCursor
    changed: StoredVectorDocument[]
    unchanged: StoredVectorDocument[]
    submittedAt: string
}

export interface SourceSyncCursor {
    cursorUpdatedAt: string | null
    cursorDocumentId: string | null
    syncedCount: number
}

export interface VectorSyncState {
    sources: Record<string, SourceSyncCursor>
    updatedAt: string
}

export interface VectorSourceDocument {
    sourceScope: VectorSourceScope
    documentKind: string
    documentId: string
    label: string | null
    rawText: string
    metadata: Record<string, unknown>
    sourceUpdatedAt: string
}

export interface StoredVectorDocument extends VectorSourceDocument {
    contentHash: string
}

export interface VectorSearchResultRow {
    source_scope: VectorSourceScope
    document_kind: string
    document_id: string
    label: string | null
    metadata: Record<string, unknown> | null
    source_updated_at: string
    score: number
}

export interface VectorSourceAdapter<TSeed> {
    stateKey: string
    sourceScope: VectorSourceScope
    documentKind: string
    fetchBatch(pool: Pool, cursor: SourceSyncCursor, limit: number): Promise<TSeed[]>
    toDocument(seed: TSeed): VectorSourceDocument
}

export interface VectorSearchOptions {
    sourceScope?: VectorSourceScope
    documentKinds?: string[]
    limit?: number
    minScore?: number
    exclude?: {
        sourceScope: VectorSourceScope
        documentKind: string
        documentId: string
    }
}