import type { Pool } from 'pg'
import { getVectorConfig } from '../config'
import {
    createEmbeddingBatch,
    downloadEmbeddingBatchResults,
    getEmbeddingBatch,
    loadPendingVectorBatchState,
    removePendingVectorBatchState,
    savePendingVectorBatchState,
    uploadEmbeddingBatchFile,
} from '../openai-batch'
import type {
    PendingVectorBatchState,
    SourceSyncCursor,
    StoredVectorDocument,
    VectorSourceAdapter,
    VectorSyncState,
} from '../types'
import { hashVectorContent, loadVectorSyncState, saveVectorSyncState } from './sync'
import { fetchExistingHashes, touchVectorDocument, upsertVectorDocument } from './storage'

export interface SubmitVectorBatchResult {
    status: 'submitted' | 'noop'
    message: string
    sourceStateKey?: string
    changedCount?: number
    unchangedCount?: number
    batchId?: string
    inputFileId?: string
    submittedAt?: string
    nextCursor?: SourceSyncCursor
}

export interface PollVectorBatchResult {
    status: 'idle' | 'pending' | 'applied' | 'failed'
    message: string
    batchId?: string
    sourceStateKey?: string
    changedCount?: number
    unchangedCount?: number
    submittedAt?: string
    batchStatus?: string
    outputFileId?: string | null
    errorFileId?: string | null
}

function defaultCursor(): SourceSyncCursor {
    return {
        cursorUpdatedAt: null,
        cursorDocumentId: null,
        syncedCount: 0,
    }
}

function buildBatchLine(document: StoredVectorDocument, model: string, dimensions: number): string {
    return JSON.stringify({
        custom_id: document.documentId,
        method: 'POST',
        url: '/v1/embeddings',
        body: {
            model,
            input: document.rawText,
            dimensions,
        },
    })
}

export async function submitNextVectorEmbeddingBatch(
    sourcePool: Pool,
    vectorPool: Pool,
    sources: Array<VectorSourceAdapter<unknown>>,
): Promise<SubmitVectorBatchResult> {
    if (loadPendingVectorBatchState()) {
        throw new Error('A pending OpenAI vector batch already exists. Poll/apply it before submitting another one.')
    }

    const cfg = getVectorConfig()
    const syncState = loadVectorSyncState()

    for (const source of sources) {
        const cursor = syncState.sources[source.stateKey] ?? defaultCursor()
        const batch = await source.fetchBatch(sourcePool, cursor, cfg.openAiBatchSize)
        if (batch.length === 0) continue

        const prepared = batch.map((seed) => {
            const document = source.toDocument(seed)
            return {
                ...document,
                contentHash: hashVectorContent(document.rawText),
            } satisfies StoredVectorDocument
        })

        const hashes = await fetchExistingHashes(
            vectorPool,
            source.sourceScope,
            source.documentKind,
            prepared.map((row) => row.documentId),
        )

        const changed = prepared.filter((row) => hashes.get(row.documentId) !== row.contentHash)
        const unchanged = prepared.filter((row) => hashes.get(row.documentId) === row.contentHash)
        const last = prepared[prepared.length - 1]
        const nextCursor: SourceSyncCursor = {
            cursorUpdatedAt: last.sourceUpdatedAt,
            cursorDocumentId: last.documentId,
            syncedCount: cursor.syncedCount + batch.length,
        }

        if (changed.length === 0) {
            for (const row of unchanged) {
                await touchVectorDocument(vectorPool, row)
            }
            syncState.sources[source.stateKey] = nextCursor
            syncState.updatedAt = new Date().toISOString()
            saveVectorSyncState(syncState)
            console.log(`[vectors:batch] ${source.stateKey} advanced ${batch.length} unchanged row(s)`)
            return {
                status: 'submitted',
                message: `${source.stateKey} advanced without batch work`,
                sourceStateKey: source.stateKey,
                changedCount: 0,
                unchangedCount: unchanged.length,
                nextCursor,
            }
        }

        const inputFileId = await uploadEmbeddingBatchFile(
            changed.map((document) => buildBatchLine(document, cfg.model, cfg.dimensions)),
        )
        const batchResponse = await createEmbeddingBatch(inputFileId)
        const submittedAt = new Date().toISOString()

        const pendingState: PendingVectorBatchState = {
            provider: 'openai',
            batchId: batchResponse.id,
            inputFileId,
            sourceStateKey: source.stateKey,
            sourceScope: source.sourceScope,
            documentKind: source.documentKind,
            nextCursor,
            changed,
            unchanged,
            submittedAt,
        }
        savePendingVectorBatchState(pendingState)
        return {
            status: 'submitted',
            message: `submitted ${changed.length} changed row(s) for ${source.stateKey} as batch ${batchResponse.id}`,
            sourceStateKey: source.stateKey,
            changedCount: changed.length,
            unchangedCount: unchanged.length,
            batchId: batchResponse.id,
            inputFileId,
            submittedAt,
            nextCursor,
        }
    }

    return { status: 'noop', message: 'no eligible vector documents left to batch-submit' }
}

export async function pollOrApplyPendingVectorEmbeddingBatch(
    vectorPool: Pool,
): Promise<PollVectorBatchResult> {
    const state = loadPendingVectorBatchState()
    if (!state) {
        return { status: 'idle', message: 'no pending OpenAI vector batch' }
    }

    const batch = await getEmbeddingBatch(state.batchId)
    if (batch.status === 'completed') {
        if (!batch.output_file_id) {
            return {
                status: 'failed',
                message: `batch ${state.batchId} completed without an output file`,
                batchId: state.batchId,
                sourceStateKey: state.sourceStateKey,
                changedCount: state.changed.length,
                unchangedCount: state.unchanged.length,
                submittedAt: state.submittedAt,
                batchStatus: batch.status,
            }
        }

        const results = await downloadEmbeddingBatchResults(batch.output_file_id)
        for (const row of state.changed) {
            const embedding = results.get(row.documentId)
            if (!embedding) {
                throw new Error(`Batch result missing embedding for document ${row.documentId}`)
            }
            await upsertVectorDocument(vectorPool, row, embedding)
        }

        for (const row of state.unchanged) {
            await touchVectorDocument(vectorPool, row)
        }

        const syncState: VectorSyncState = loadVectorSyncState()
        syncState.sources[state.sourceStateKey] = state.nextCursor
        syncState.updatedAt = new Date().toISOString()
        saveVectorSyncState(syncState)
        removePendingVectorBatchState()

        return {
            status: 'applied',
            message: `applied batch ${state.batchId} with ${state.changed.length} embeddings for ${state.sourceStateKey}`,
            batchId: state.batchId,
            sourceStateKey: state.sourceStateKey,
            changedCount: state.changed.length,
            unchangedCount: state.unchanged.length,
            submittedAt: state.submittedAt,
            batchStatus: batch.status,
            outputFileId: batch.output_file_id,
            errorFileId: batch.error_file_id,
        }
    }

    if (batch.status === 'failed' || batch.status === 'expired' || batch.status === 'cancelled') {
        return {
            status: 'failed',
            message: `batch ${state.batchId} ended with status ${batch.status}`,
            batchId: state.batchId,
            sourceStateKey: state.sourceStateKey,
            changedCount: state.changed.length,
            unchangedCount: state.unchanged.length,
            submittedAt: state.submittedAt,
            batchStatus: batch.status,
            outputFileId: batch.output_file_id,
            errorFileId: batch.error_file_id,
        }
    }

    return {
        status: 'pending',
        message: `batch ${state.batchId} status=${batch.status}`,
        batchId: state.batchId,
        sourceStateKey: state.sourceStateKey,
        changedCount: state.changed.length,
        unchangedCount: state.unchanged.length,
        submittedAt: state.submittedAt,
        batchStatus: batch.status,
        outputFileId: batch.output_file_id,
        errorFileId: batch.error_file_id,
    }
}