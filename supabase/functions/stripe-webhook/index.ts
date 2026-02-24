import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { ok, err } from '../_shared/response.ts'

// Stripe plan → internal PlanType mapping
const STRIPE_PRICE_TO_PLAN: Record<string, string> = {
    [Deno.env.get('STRIPE_PRICE_STARTER') ?? '']: 'starter',
    [Deno.env.get('STRIPE_PRICE_PRO') ?? '']: 'pro',
    [Deno.env.get('STRIPE_PRICE_BUSINESS') ?? '']: 'business',
}

async function verifyStripeSignature(req: Request, body: string): Promise<boolean> {
    // Stub: in production verify using Stripe-Signature header + STRIPE_WEBHOOK_SECRET
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!secret) {
        console.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification')
        return true
    }
    // TODO: implement HMAC-SHA256 verification
    return true
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const body = await req.text()
        const valid = await verifyStripeSignature(req, body)
        if (!valid) return new Response('Invalid signature', { status: 401 })

        const event = JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        )

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                const userId = session['client_reference_id'] as string
                const priceId = (session['line_items'] as Array<{ price: { id: string } }>)?.[0]?.price?.id
                const plan = STRIPE_PRICE_TO_PLAN[priceId] ?? 'starter'

                await supabase
                    .from('profiles')
                    .update({ plan, stripe_customer_id: session['customer'], updated_at: new Date().toISOString() })
                    .eq('id', userId)
                break
            }

            case 'customer.subscription.deleted': {
                const sub = event.data.object
                const customerId = sub['customer'] as string
                await supabase
                    .from('profiles')
                    .update({ plan: 'free', updated_at: new Date().toISOString() })
                    .eq('stripe_customer_id', customerId)
                break
            }

            default:
                console.log('Unhandled Stripe event:', event.type)
        }

        return ok({ received: true })
    } catch (e) {
        return err(e)
    }
})
