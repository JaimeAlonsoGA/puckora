import { NextRequest, NextResponse } from 'next/server'

/**
 * Stripe webhook handler stub.
 * Will be implemented when Stripe integration is set up.
 */
export async function POST(_req: NextRequest) {
    void _req
    // TODO: Verify Stripe signature, process subscription events
    return NextResponse.json({ received: true })
}
