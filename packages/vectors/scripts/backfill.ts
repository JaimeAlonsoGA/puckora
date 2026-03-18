import { getVectorConfig } from '../src/config'
import { backfillDefaultVectors, printDefaultVectorStatus } from '../src/runtime'

async function main(): Promise<void> {
    const cfg = getVectorConfig()
    console.log(`[vectors:backfill] provider=${cfg.provider} model=${cfg.model} dims=${cfg.dimensions} batchSize=${cfg.openAiBatchSize} pollMs=${cfg.openAiBatchPollMs}`)
    await printDefaultVectorStatus('[vectors:backfill]')
    if (cfg.provider !== 'openai') {
        throw new Error('vectors:backfill requires VECTOR_EMBEDDING_PROVIDER=openai')
    }
    await backfillDefaultVectors()
}

main().catch((error) => {
    console.error(`[vectors:backfill] failed: ${(error as Error).message}`)
    process.exit(1)
})