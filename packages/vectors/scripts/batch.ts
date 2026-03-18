import { getVectorConfig } from '../src/config'
import { loadPendingVectorBatchState } from '../src/openai-batch'
import { pollOrApplyDefaultVectorBatch, submitNextDefaultVectorBatch } from '../src/runtime'

async function main(): Promise<void> {
    const cfg = getVectorConfig()
    console.log(`[vectors:batch] provider=${cfg.provider} model=${cfg.model} dims=${cfg.dimensions} batchSize=${cfg.openAiBatchSize}`)

    if (cfg.provider !== 'openai') {
        throw new Error('vectors:batch requires VECTOR_EMBEDDING_PROVIDER=openai')
    }

    const pending = loadPendingVectorBatchState()
    const result = pending
        ? await pollOrApplyDefaultVectorBatch()
        : await submitNextDefaultVectorBatch()

    console.log(`[vectors:batch] ${result.message}`)
}

main().catch((error) => {
    console.error(`[vectors:batch] failed: ${(error as Error).message}`)
    process.exit(1)
})