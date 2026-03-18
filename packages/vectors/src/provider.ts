import { getVectorConfig } from './config'

interface OpenAiEmbeddingResponse {
    data: Array<{ embedding: number[] }>
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    const cfg = getVectorConfig()
    if (cfg.provider === 'openai') {
        const apiKey = process.env['OPENAI_API_KEY']?.trim()
        if (!apiKey) throw new Error('OPENAI_API_KEY is required when VECTOR_EMBEDDING_PROVIDER=openai')

        const body: Record<string, unknown> = {
            input: texts,
            model: cfg.model,
        }
        if (cfg.dimensions > 0) body['dimensions'] = cfg.dimensions

        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                authorization: `Bearer ${apiKey}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            throw new Error(`OpenAI embeddings failed: ${response.status} ${await response.text()}`)
        }

        const json = await response.json() as OpenAiEmbeddingResponse
        return validateEmbeddings(json.data.map((item) => item.embedding), cfg.dimensions)
    }

    const response = await fetch(`${cfg.ollamaBaseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: cfg.model, input: texts }),
    })

    if (!response.ok) {
        throw new Error(`Ollama embeddings failed: ${response.status} ${await response.text()}`)
    }

    const json = await response.json() as { embeddings?: number[][] }
    if (!Array.isArray(json.embeddings)) {
        throw new Error('Ollama embeddings returned an unexpected payload shape')
    }

    return validateEmbeddings(json.embeddings, cfg.dimensions)
}

function validateEmbeddings(embeddings: number[][], expectedDimensions: number): number[][] {
    embeddings.forEach((embedding, index) => {
        if (embedding.length !== expectedDimensions) {
            throw new Error(`Embedding ${index} dimension mismatch: expected ${expectedDimensions}, got ${embedding.length}`)
        }
    })
    return embeddings
}