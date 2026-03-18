import { getVectorConfig } from '../src/config'
import { syncDefaultVectorsOnce, watchDefaultVectors } from '../src/runtime'

const WATCH_MODE = process.argv.includes('--watch')

async function main(): Promise<void> {
    const cfg = getVectorConfig()
    console.log(`[vectors] provider=${cfg.provider} model=${cfg.model} dims=${cfg.dimensions} batch=${cfg.syncBatchSize} watch=${WATCH_MODE}`)
    if (WATCH_MODE) {
        await watchDefaultVectors()
        return
    }
    await syncDefaultVectorsOnce()
}

main().catch((error) => {
    console.error(`[vectors] fatal: ${(error as Error).message}`)
    process.exit(1)
})