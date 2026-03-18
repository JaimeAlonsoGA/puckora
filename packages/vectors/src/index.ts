export { getVectorConfig, getVectorProvider } from './config'
export { embedTexts } from './provider'
export {
    syncDefaultVectorsOnce,
    watchDefaultVectors,
    rebuildDefaultVectors,
    submitNextDefaultVectorBatch,
    pollOrApplyDefaultVectorBatch,
    backfillDefaultVectors,
    printDefaultVectorStatus,
    queryVectorDocuments,
} from './runtime'
export {
    createSourcePool,
    createVectorPool,
    ensureVectorSchema,
    dropVectorDocuments,
    searchVectorDocumentsByDocument,
    searchVectorDocumentsByQuery,
} from './core/storage'
export {
    loadVectorSyncState,
    saveVectorSyncState,
    removeVectorSyncState,
    hashVectorContent,
    syncVectorSourcesOnce,
} from './core/sync'
export {
    submitNextVectorEmbeddingBatch,
    pollOrApplyPendingVectorEmbeddingBatch,
} from './core/batch'
export {
    ensureAmazonVectorSchema,
    loadAmazonVectorSyncState,
    saveAmazonVectorSyncState,
    removeAmazonVectorSyncState,
    syncAmazonVectorsOnce,
    syncAmazonProductVectorsOnce,
    watchAmazonVectors,
    watchAmazonProductVectors,
    rebuildAmazonVectors,
    rebuildAmazonProductVectors,
    searchAmazonProductsByQuery,
    searchAmazonProductsByAsin,
} from './amazon'
export { amazonCategoryVectorSource, amazonKeywordVectorSource, amazonProductVectorSource, defaultVectorSources } from './sources'
export {
    loadPendingVectorBatchState,
    savePendingVectorBatchState,
    removePendingVectorBatchState,
    createEmbeddingBatch,
    getEmbeddingBatch,
    type OpenAiBatch,
} from './openai-batch'
export type * from './types/index'