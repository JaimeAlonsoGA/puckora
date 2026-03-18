import { getVectorConfig } from './config'
import { createSourcePool, createVectorPool, dropVectorDocuments, ensureVectorSchema, searchVectorDocumentsByQuery } from './core/storage'
import {
    pollOrApplyPendingVectorEmbeddingBatch,
    submitNextVectorEmbeddingBatch,
    type PollVectorBatchResult,
    type SubmitVectorBatchResult,
} from './core/batch'
import { loadVectorSyncState, removeVectorSyncState, syncVectorSourcesOnce } from './core/sync'
import { getEmbeddingBatch, loadPendingVectorBatchState } from './openai-batch'
import { defaultVectorSources } from './sources'

function formatDuration(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) return 'unknown'

    const totalSeconds = Math.floor(ms / 1000)
    const days = Math.floor(totalSeconds / 86_400)
    const hours = Math.floor((totalSeconds % 86_400) / 3_600)
    const minutes = Math.floor((totalSeconds % 3_600) / 60)
    const seconds = totalSeconds % 60
    const parts = [
        days > 0 ? `${days}d` : null,
        hours > 0 ? `${hours}h` : null,
        minutes > 0 ? `${minutes}m` : null,
        (parts => parts)(null),
    ]
    const filtered = parts.filter(Boolean) as string[]
    if (filtered.length === 0) return `${seconds}s`
    if (filtered.length === 1 && seconds > 0 && days === 0) return `${filtered[0]} ${seconds}s`
    return filtered.slice(0, 2).join(' ')
}

function formatIso(iso: string | null | undefined): string {
    if (!iso) return 'none'
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    return `${date.toISOString()} (${formatDuration(Date.now() - date.getTime())} ago)`
}

function describeConnectionString(connectionString: string): string {
    try {
        const parsed = new URL(connectionString)
        const port = parsed.port || (parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:' ? '5432' : '')
        const database = parsed.pathname.replace(/^\//, '') || '(default)'
        return `${parsed.hostname}:${port}/${database}`
    } catch {
        return '(unparseable)'
    }
}

function logPendingBatchSummary(prefix: string): void {
    const pending = loadPendingVectorBatchState()
    if (!pending) {
        console.log(`${prefix} pending batch: none`)
        return
    }

    console.log(
        `${prefix} pending batch=${pending.batchId} source=${pending.sourceStateKey} ` +
        `changed=${pending.changed.length} unchanged=${pending.unchanged.length}`,
    )
    console.log(`${prefix} submitted=${formatIso(pending.submittedAt)}`)
    console.log(
        `${prefix} next cursor updatedAt=${pending.nextCursor.cursorUpdatedAt ?? 'none'} ` +
        `documentId=${pending.nextCursor.cursorDocumentId ?? 'none'} synced=${pending.nextCursor.syncedCount}`,
    )
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function syncDefaultVectorsOnce(): Promise<number> {
    const sourcePool = createSourcePool()
    const vectorPool = await createVectorPool()

    try {
        return await syncVectorSourcesOnce(sourcePool, vectorPool, [...defaultVectorSources])
    } finally {
        await sourcePool.end()
        await vectorPool.end()
    }
}

export async function watchDefaultVectors(): Promise<void> {
    const cfg = getVectorConfig()
    do {
        const processed = await syncDefaultVectorsOnce()
        console.log(`[vectors] cycle complete (${processed} row(s)) — sleeping ${cfg.syncPollMs}ms`)
        await sleep(cfg.syncPollMs)
    } while (true)
}

export async function rebuildDefaultVectors(): Promise<void> {
    const pool = await createVectorPool()
    try {
        await dropVectorDocuments(pool)
        removeVectorSyncState()
        await ensureVectorSchema(pool)
    } finally {
        await pool.end()
    }

    await syncDefaultVectorsOnce()
}

export async function submitNextDefaultVectorBatch(): Promise<SubmitVectorBatchResult> {
    const sourcePool = createSourcePool()
    const vectorPool = await createVectorPool()

    try {
        return await submitNextVectorEmbeddingBatch(sourcePool, vectorPool, [...defaultVectorSources])
    } finally {
        await sourcePool.end()
        await vectorPool.end()
    }
}

export async function pollOrApplyDefaultVectorBatch(): Promise<PollVectorBatchResult> {
    const vectorPool = await createVectorPool()
    try {
        return await pollOrApplyPendingVectorEmbeddingBatch(vectorPool)
    } finally {
        await vectorPool.end()
    }
}

export async function printDefaultVectorStatus(prefix = '[vectors:status]'): Promise<void> {
    const cfg = getVectorConfig()
    const syncState = loadVectorSyncState()

    console.log(`${prefix} provider=${cfg.provider} model=${cfg.model} dims=${cfg.dimensions}`)
    console.log(`${prefix} sourceDb=${describeConnectionString(cfg.sourceDatabaseUrl)}`)
    console.log(`${prefix} vectorDb=${describeConnectionString(cfg.vectorDatabaseUrl)}`)
    console.log(`${prefix} syncStateFile=${cfg.stateFile}`)
    console.log(`${prefix} batchStateFile=${cfg.openAiBatchStateFile}`)

    const cursors = Object.entries(syncState.sources)
    if (cursors.length === 0) {
        console.log(`${prefix} sync cursors: none yet`)
    } else {
        for (const [stateKey, cursor] of cursors) {
            console.log(
                `${prefix} cursor ${stateKey}: synced=${cursor.syncedCount} ` +
                `updatedAt=${cursor.cursorUpdatedAt ?? 'none'} documentId=${cursor.cursorDocumentId ?? 'none'}`,
            )
        }
    }

    const pending = loadPendingVectorBatchState()
    if (!pending) {
        console.log(`${prefix} pending batch: none`)
        return
    }

    logPendingBatchSummary(prefix)

    if (cfg.provider !== 'openai') return

    try {
        const batch = await getEmbeddingBatch(pending.batchId)
        console.log(
            `${prefix} openai status=${batch.status} outputFile=${batch.output_file_id ?? 'none'} ` +
            `errorFile=${batch.error_file_id ?? 'none'}`,
        )
    } catch (error) {
        console.log(`${prefix} openai status lookup failed: ${(error as Error).message}`)
    }
}

export async function backfillDefaultVectors(): Promise<void> {
    const cfg = getVectorConfig()

    while (true) {
        const pending = loadPendingVectorBatchState()
        if (pending) {
            logPendingBatchSummary('[vectors:backfill]')
            const result = await pollOrApplyDefaultVectorBatch()
            console.log(`[vectors:backfill] ${result.message}`)

            if (result.batchStatus) {
                console.log(
                    `[vectors:backfill] remote status=${result.batchStatus} ` +
                    `outputFile=${result.outputFileId ?? 'none'} errorFile=${result.errorFileId ?? 'none'}`,
                )
            }

            if (result.status === 'failed') {
                throw new Error(result.message)
            }
            if (result.status === 'pending') {
                console.log(
                    `[vectors:backfill] waiting ${cfg.openAiBatchPollMs}ms (${formatDuration(cfg.openAiBatchPollMs)}) before polling again`,
                )
                console.log('[vectors:backfill] run `npm run status` for a fresh local + OpenAI batch snapshot')
                await sleep(cfg.openAiBatchPollMs)
            }
            continue
        }

        const result = await submitNextDefaultVectorBatch()
        console.log(`[vectors:backfill] ${result.message}`)

        if (result.status === 'submitted') {
            console.log(
                `[vectors:backfill] source=${result.sourceStateKey ?? 'unknown'} changed=${result.changedCount ?? 0} ` +
                `unchanged=${result.unchangedCount ?? 0}`,
            )
            if (result.batchId) {
                console.log(
                    `[vectors:backfill] batch=${result.batchId} inputFile=${result.inputFileId ?? 'unknown'} ` +
                    `submitted=${formatIso(result.submittedAt)}`,
                )
            }
            if (result.nextCursor) {
                console.log(
                    `[vectors:backfill] next cursor updatedAt=${result.nextCursor.cursorUpdatedAt ?? 'none'} ` +
                    `documentId=${result.nextCursor.cursorDocumentId ?? 'none'} synced=${result.nextCursor.syncedCount}`,
                )
            }
        }

        if (result.status === 'noop') {
            console.log('[vectors:backfill] backlog complete — switching to watch mode')
            break
        }

        console.log(
            `[vectors:backfill] waiting ${cfg.openAiBatchPollMs}ms (${formatDuration(cfg.openAiBatchPollMs)}) before polling batch result`,
        )
        console.log('[vectors:backfill] OpenAI Batch is asynchronous and can take minutes to hours within its 24h window')
        console.log('[vectors:backfill] run `npm run status` any time to inspect the saved batch + cursor state')
        await sleep(cfg.openAiBatchPollMs)
    }

    await watchDefaultVectors()
}

export async function queryVectorDocuments(query: string, options?: { scope?: string; kind?: string; limit?: number; minScore?: number }) {
    return searchVectorDocumentsByQuery(query, {
        sourceScope: options?.scope as never,
        documentKinds: options?.kind ? [options.kind] : undefined,
        limit: options?.limit,
        minScore: options?.minScore,
    })
}