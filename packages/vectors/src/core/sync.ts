import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { Pool } from 'pg'
import { getVectorConfig } from '../config'
import type {
    SourceSyncCursor,
    StoredVectorDocument,
    VectorSourceAdapter,
    VectorSyncState,
} from '../types'
import { embedTexts } from '../provider'
import { fetchExistingHashes, touchVectorDocument, upsertVectorDocument } from './storage'

function defaultCursor(): SourceSyncCursor {
    return {
        cursorUpdatedAt: null,
        cursorDocumentId: null,
        syncedCount: 0,
    }
}

export function hashVectorContent(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex')
}

export function loadVectorSyncState(): VectorSyncState {
    const file = getVectorConfig().stateFile
    if (!fs.existsSync(file)) {
        return { sources: {}, updatedAt: new Date(0).toISOString() }
    }
    return JSON.parse(fs.readFileSync(file, 'utf8')) as VectorSyncState
}

export function saveVectorSyncState(state: VectorSyncState): void {
    const file = getVectorConfig().stateFile
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

export function removeVectorSyncState(): void {
    const file = getVectorConfig().stateFile
    if (fs.existsSync(file)) fs.unlinkSync(file)
}

export async function syncVectorSourcesOnce(
    sourcePool: Pool,
    vectorPool: Pool,
    sources: Array<VectorSourceAdapter<unknown>>,
): Promise<number> {
    const state = loadVectorSyncState()
    const cfg = getVectorConfig()
    let processed = 0

    for (const source of sources) {
        const cursor = state.sources[source.stateKey] ?? defaultCursor()

        while (true) {
            const batch = await source.fetchBatch(sourcePool, cursor, cfg.syncBatchSize)
            if (batch.length === 0) break

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
            const embeddings = changed.length > 0 ? await embedTexts(changed.map((row) => row.rawText)) : []

            for (let index = 0; index < changed.length; index += 1) {
                await upsertVectorDocument(vectorPool, changed[index], embeddings[index])
            }

            for (const row of unchanged) {
                await touchVectorDocument(vectorPool, row)
            }

            const last = prepared[prepared.length - 1]
            cursor.cursorUpdatedAt = last.sourceUpdatedAt
            cursor.cursorDocumentId = last.documentId
            cursor.syncedCount += batch.length
            state.sources[source.stateKey] = cursor
            state.updatedAt = new Date().toISOString()
            saveVectorSyncState(state)

            processed += batch.length
            console.log(`[vectors] ${source.stateKey} synced ${batch.length} row(s) | changed=${changed.length} unchanged=${unchanged.length} | cursor=${cursor.cursorUpdatedAt} ${cursor.cursorDocumentId}`)
        }
    }

    return processed
}