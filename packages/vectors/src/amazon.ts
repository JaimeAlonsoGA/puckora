import { getVectorConfig } from './config'
import {
    createSourcePool,
    createVectorPool,
    dropVectorDocuments,
    ensureVectorSchema,
    searchVectorDocumentsByDocument,
    searchVectorDocumentsByQuery,
} from './core/storage'
import {
    loadVectorSyncState,
    removeVectorSyncState,
    saveVectorSyncState,
    syncVectorSourcesOnce,
} from './core/sync'
import type { AmazonVectorSearchRow, VectorSyncState } from './types'
import {
    amazonCategoryVectorSource,
    amazonKeywordVectorSource,
    amazonProductVectorSource,
    mapAmazonProductSearchResult,
} from './sources/amazon'

const AMAZON_VECTOR_SOURCES = [
    amazonProductVectorSource,
    amazonKeywordVectorSource,
    amazonCategoryVectorSource,
] as const

export async function ensureAmazonVectorSchema(pool: Awaited<ReturnType<typeof createVectorPool>>): Promise<void> {
    await ensureVectorSchema(pool)
}

export function loadAmazonVectorSyncState(): VectorSyncState {
    return loadVectorSyncState()
}

export function saveAmazonVectorSyncState(state: VectorSyncState): void {
    saveVectorSyncState(state)
}

export function removeAmazonVectorSyncState(): void {
    removeVectorSyncState()
}

export async function syncAmazonVectorsOnce(): Promise<number> {
    const sourcePool = createSourcePool()
    const vectorPool = await createVectorPool()

    try {
        return await syncVectorSourcesOnce(sourcePool, vectorPool, [...AMAZON_VECTOR_SOURCES])
    } finally {
        await sourcePool.end()
        await vectorPool.end()
    }
}

export async function syncAmazonProductVectorsOnce(): Promise<number> {
    return syncAmazonVectorsOnce()
}

export async function watchAmazonVectors(): Promise<void> {
    const cfg = getVectorConfig()
    do {
        const processed = await syncAmazonVectorsOnce()
        console.log(`[vectors] cycle complete (${processed} row(s)) — sleeping ${cfg.syncPollMs}ms`)
        await new Promise((resolve) => setTimeout(resolve, cfg.syncPollMs))
    } while (true)
}

export async function watchAmazonProductVectors(): Promise<void> {
    await watchAmazonVectors()
}

export async function rebuildAmazonVectors(): Promise<void> {
    const pool = await createVectorPool()
    try {
        await dropVectorDocuments(pool)
        removeVectorSyncState()
        await ensureVectorSchema(pool)
    } finally {
        await pool.end()
    }

    await syncAmazonVectorsOnce()
}

export async function rebuildAmazonProductVectors(): Promise<void> {
    await rebuildAmazonVectors()
}

export async function searchAmazonProductsByQuery(
    query: string,
    limit = getVectorConfig().queryLimit,
    minScore = getVectorConfig().minScore,
): Promise<AmazonVectorSearchRow[]> {
    const rows = await searchVectorDocumentsByQuery(query, {
        sourceScope: 'amazon',
        documentKinds: ['product'],
        limit,
        minScore,
    })
    return rows.map(mapAmazonProductSearchResult)
}

export async function searchAmazonProductsByAsin(
    asin: string,
    limit = getVectorConfig().queryLimit,
    minScore = getVectorConfig().minScore,
): Promise<AmazonVectorSearchRow[]> {
    const rows = await searchVectorDocumentsByDocument('amazon', 'product', asin, {
        sourceScope: 'amazon',
        documentKinds: ['product'],
        limit,
        minScore,
    })
    return rows.map(mapAmazonProductSearchResult)
}