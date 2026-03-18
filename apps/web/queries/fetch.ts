'use client'

export async function fetchJson<T>(input: string, init: RequestInit | undefined, errorMessage: string): Promise<T> {
    const response = await fetch(input, init)

    if (!response.ok) {
        throw new Error(`${errorMessage}: ${response.status}`)
    }

    return response.json() as Promise<T>
}