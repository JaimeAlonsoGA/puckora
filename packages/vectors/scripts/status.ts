import { printDefaultVectorStatus } from '../src/runtime'

async function main(): Promise<void> {
    await printDefaultVectorStatus()
}

main().catch((error) => {
    console.error(`[vectors:status] failed: ${(error as Error).message}`)
    process.exit(1)
})