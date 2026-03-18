import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import type { EmbeddingProvider, VectorConfig } from './types'

const DEFAULT_VECTOR_DATABASE_URL = 'postgresql://127.0.0.1:5432/puckora_vectors'
const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
const DEFAULT_OLLAMA_MODEL = 'nomic-embed-text'
const DEFAULT_OPENAI_MODEL = 'text-embedding-3-small'

let envBootstrapped = false

function looksLikeWorkspaceRoot(dirPath: string): boolean {
    const packageJsonPath = path.join(dirPath, 'package.json')
    if (!fs.existsSync(packageJsonPath)) return false

    try {
        const raw = fs.readFileSync(packageJsonPath, 'utf8')
        return raw.includes('"workspaces"')
    } catch {
        return false
    }
}

function findWorkspaceRoot(startDir: string): string | null {
    let current = path.resolve(startDir)

    while (true) {
        if (looksLikeWorkspaceRoot(current)) return current
        const parent = path.dirname(current)
        if (parent === current) return null
        current = parent
    }
}

function loadEnvFile(filePath: string): void {
    if (!fs.existsSync(filePath)) return
    dotenv.config({ path: filePath, override: false })
}

function bootstrapVectorEnv(): void {
    if (envBootstrapped) return
    envBootstrapped = true

    const workspaceRoot = findWorkspaceRoot(process.cwd())
    if (!workspaceRoot) return

    loadEnvFile(path.join(workspaceRoot, '.env'))
}

function readString(keys: string[], fallback?: string): string {
    for (const key of keys) {
        const value = process.env[key]?.trim()
        if (value) return value
    }
    if (fallback != null) return fallback
    throw new Error(`Missing required environment variable: one of ${keys.join(', ')}`)
}

function readInt(keys: string[], fallback: number): number {
    for (const key of keys) {
        const raw = process.env[key]?.trim()
        if (!raw) continue
        const parsed = Number.parseInt(raw, 10)
        if (Number.isFinite(parsed) && parsed > 0) return parsed
        throw new Error(`${key} must be a positive integer, got "${raw}"`)
    }
    return fallback
}

function readFloat(keys: string[], fallback: number): number {
    for (const key of keys) {
        const raw = process.env[key]?.trim()
        if (!raw) continue
        const parsed = Number.parseFloat(raw)
        if (Number.isFinite(parsed) && parsed >= 0) return parsed
        throw new Error(`${key} must be a non-negative number, got "${raw}"`)
    }
    return fallback
}

export function getVectorProvider(): EmbeddingProvider {
    const explicitProvider = process.env['VECTOR_EMBEDDING_PROVIDER']?.trim().toLowerCase()
    const raw = explicitProvider || (process.env['OPENAI_API_KEY']?.trim() ? 'openai' : 'ollama')
    if (raw === 'ollama' || raw === 'openai') return raw
    throw new Error(`VECTOR_EMBEDDING_PROVIDER must be "ollama" or "openai", got "${raw}"`)
}

function getDefaultDimensions(provider: EmbeddingProvider): number {
    return provider === 'openai' ? 1536 : 768
}

export function getVectorConfig(): VectorConfig {
    bootstrapVectorEnv()

    const provider = getVectorProvider()
    const model = provider === 'openai'
        ? readString(['VECTOR_EMBEDDING_MODEL', 'OPENAI_EMBEDDING_MODEL'], DEFAULT_OPENAI_MODEL)
        : readString(['VECTOR_EMBEDDING_MODEL', 'LOCAL_EMBEDDING_MODEL'], DEFAULT_OLLAMA_MODEL)

    return {
        sourceDatabaseUrl: readString(['DATABASE_PROXY_URL', 'DATABASE_URL']),
        vectorDatabaseUrl: readString(['VECTOR_DATABASE_URL', 'LOCAL_VECTOR_DATABASE_URL'], DEFAULT_VECTOR_DATABASE_URL),
        provider,
        model,
        dimensions: readInt(['VECTOR_EMBEDDING_DIMENSIONS', 'LOCAL_EMBEDDING_DIMENSIONS'], getDefaultDimensions(provider)),
        ollamaBaseUrl: readString(['VECTOR_OLLAMA_BASE_URL', 'OLLAMA_BASE_URL'], DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, ''),
        syncBatchSize: readInt(['VECTOR_SYNC_BATCH_SIZE', 'LOCAL_VECTOR_SYNC_BATCH_SIZE'], 25),
        syncPollMs: readInt(['VECTOR_SYNC_POLL_MS', 'LOCAL_VECTOR_SYNC_POLL_MS'], 30_000),
        openAiBatchSize: readInt(['VECTOR_OPENAI_BATCH_SIZE'], 5_000),
        openAiBatchPollMs: readInt(['VECTOR_OPENAI_BATCH_POLL_MS'], 300_000),
        openAiBatchStateFile: readString(
            ['VECTOR_OPENAI_BATCH_STATE_FILE'],
            path.resolve(process.cwd(), 'runs/vectors/openai-batch-state.json'),
        ),
        minScore: readFloat(['VECTOR_MIN_SCORE'], 0.5),
        queryLimit: readInt(['VECTOR_QUERY_LIMIT'], 6),
        stateFile: readString(
            ['VECTOR_SYNC_STATE_FILE', 'LOCAL_VECTOR_SYNC_STATE_FILE'],
            path.resolve(process.cwd(), 'runs/vectors/sync-state.json'),
        ),
    }
}