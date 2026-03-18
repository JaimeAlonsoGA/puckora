import { getVectorConfig } from '../src/config'
import { rebuildDefaultVectors } from '../src/runtime'

async function main(): Promise<void> {
    const cfg = getVectorConfig()
    console.log(`[vectors] rebuild start provider=${cfg.provider} model=${cfg.model} dims=${cfg.dimensions}`)
    await rebuildDefaultVectors()
    console.log('[vectors] rebuild complete')
}

main().catch((error) => {
    console.error(`[vectors] rebuild failed: ${(error as Error).message}`)
    process.exit(1)
})