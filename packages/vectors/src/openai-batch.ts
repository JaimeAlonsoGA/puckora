import fs from 'node:fs'
import path from 'node:path'
import { getVectorConfig } from './config'
import type { PendingVectorBatchState } from './types'

export interface OpenAiBatch {
    id: string
    status: string
    output_file_id: string | null
    error_file_id: string | null
}

interface OpenAiEmbeddingBatchResultLine {
    custom_id: string
    response?: {
        status_code: number
        body?: {
            data?: Array<{ embedding: number[] }>
        }
    }
    error?: unknown
}

function getOpenAiApiKey(): string {
    const apiKey = process.env['OPENAI_API_KEY']?.trim()
    if (!apiKey) throw new Error('OPENAI_API_KEY is required when VECTOR_EMBEDDING_PROVIDER=openai')
    return apiKey
}

export function loadPendingVectorBatchState(): PendingVectorBatchState | null {
    const file = getVectorConfig().openAiBatchStateFile
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8')) as PendingVectorBatchState
}

export function savePendingVectorBatchState(state: PendingVectorBatchState): void {
    const file = getVectorConfig().openAiBatchStateFile
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

export function removePendingVectorBatchState(): void {
    const file = getVectorConfig().openAiBatchStateFile
    if (fs.existsSync(file)) fs.unlinkSync(file)
}

export async function uploadEmbeddingBatchFile(lines: string[]): Promise<string> {
    const form = new FormData()
    form.append('purpose', 'batch')
    form.append('file', new Blob([`${lines.join('\n')}\n`], { type: 'application/jsonl' }), 'vector-embeddings.jsonl')

    const response = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: {
            authorization: `Bearer ${getOpenAiApiKey()}`,
        },
        body: form,
    })

    if (!response.ok) {
        throw new Error(`OpenAI batch file upload failed: ${response.status} ${await response.text()}`)
    }

    const json = await response.json() as { id?: string }
    if (!json.id) throw new Error('OpenAI batch file upload returned no file id')
    return json.id
}

export async function createEmbeddingBatch(inputFileId: string): Promise<OpenAiBatch> {
    const response = await fetch('https://api.openai.com/v1/batches', {
        method: 'POST',
        headers: {
            authorization: `Bearer ${getOpenAiApiKey()}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            input_file_id: inputFileId,
            endpoint: '/v1/embeddings',
            completion_window: '24h',
        }),
    })

    if (!response.ok) {
        throw new Error(`OpenAI batch create failed: ${response.status} ${await response.text()}`)
    }

    return await response.json() as OpenAiBatch
}

export async function getEmbeddingBatch(batchId: string): Promise<OpenAiBatch> {
    const response = await fetch(`https://api.openai.com/v1/batches/${batchId}`, {
        headers: {
            authorization: `Bearer ${getOpenAiApiKey()}`,
        },
    })

    if (!response.ok) {
        throw new Error(`OpenAI batch fetch failed: ${response.status} ${await response.text()}`)
    }

    return await response.json() as OpenAiBatch
}

export async function downloadEmbeddingBatchResults(fileId: string): Promise<Map<string, number[]>> {
    const response = await fetch(`https://api.openai.com/v1/files/${fileId}/content`, {
        headers: {
            authorization: `Bearer ${getOpenAiApiKey()}`,
        },
    })

    if (!response.ok) {
        throw new Error(`OpenAI batch results download failed: ${response.status} ${await response.text()}`)
    }

    const text = await response.text()
    const results = new Map<string, number[]>()

    for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const parsed = JSON.parse(trimmed) as OpenAiEmbeddingBatchResultLine
        const embedding = parsed.response?.body?.data?.[0]?.embedding
        if (!parsed.custom_id || !embedding) continue
        results.set(parsed.custom_id, embedding)
    }

    return results
}