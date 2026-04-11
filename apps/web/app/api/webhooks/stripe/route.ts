import { NextRequest, NextResponse } from 'next/server'

/**
 * Stripe webhook handler stub.
 * Will be implemented when Stripe integration is set up.
 *
 * IMPORTANT: Do not accept webhook payloads until signature verification is
 * implemented (Stripe-Signature header + HMAC validation via stripe.webhooks.constructEvent).
 */
export async function POST(_req: NextRequest) {
    void _req
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
