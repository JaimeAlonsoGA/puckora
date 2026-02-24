import { corsHeaders } from './cors.ts'

export function ok<T>(data: T, status = 200): Response {
    return new Response(JSON.stringify({ data, error: null }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

export function err(error: unknown, status = 500): Response {
    const message = error instanceof Error ? error.message : String(error)
    const httpStatus = message.includes('Unauthorized') ? 401
        : message.includes('Forbidden') ? 403
            : message.includes('Not Found') ? 404
                : message.includes('plan limit') ? 429
                    : status

    return new Response(JSON.stringify({ data: null, error: { message } }), {
        status: httpStatus,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}
