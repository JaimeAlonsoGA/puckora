import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validateAuth } from '../_shared/auth.ts'
import { enforcePlanLimit } from '../_shared/plan-gate.ts'
import { ok, err } from '../_shared/response.ts'

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
        )

        const user = await validateAuth(supabase)
        const method = req.method.toUpperCase()

        if (method === 'GET') {
            const { data, error } = await supabase
                .from('tracked_products')
                .select('*, product:products(id, asin, title, main_image_url, price, bsr, rating, review_count, monthly_sales_est, marketplace, brand, bsr_category)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            return ok(data)
        }

        if (method === 'POST') {
            await enforcePlanLimit(supabase, user.id, 'savedProducts')
            const body = await req.json()

            // If caller passes asin + marketplace instead of product_id, resolve it
            let product_id = body.product_id
            if (!product_id && body.asin) {
                const marketplace = body.marketplace ?? 'US'
                // Try to find existing product row by asin + marketplace
                const { data: existing } = await supabase
                    .from('products')
                    .select('id')
                    .eq('asin', body.asin)
                    .eq('marketplace', marketplace)
                    .maybeSingle()

                if (existing) {
                    product_id = existing.id
                } else {
                    // Upsert a minimal product stub so we can link to it
                    const { data: inserted, error: insertErr } = await supabase
                        .from('products')
                        .insert({
                            asin: body.asin,
                            marketplace,
                            title: body.title ?? body.asin,
                            price: body.price ?? null,
                            bsr: body.bsr ?? null,
                            rating: body.rating ?? null,
                            review_count: body.review_count ?? null,
                        })
                        .select('id')
                        .single()
                    if (insertErr) throw insertErr
                    product_id = inserted.id
                }
            }

            if (!product_id) throw new Error('product_id or asin is required')

            const { asin: _asin, marketplace: _mp, title: _title, price: _price,
                bsr: _bsr, rating: _rating, review_count: _rc, ...rest } = body

            const { data, error } = await supabase
                .from('tracked_products')
                .insert({ ...rest, product_id, user_id: user.id })
                .select('*, product:products(id, asin, title, main_image_url, price, bsr, rating, review_count, monthly_sales_est, marketplace, brand, bsr_category)')
                .single()
            if (error) throw error
            return ok(data, 201)
        }

        if (method === 'PATCH') {
            const body = await req.json()
            const { id, ...updates } = body
            if (!id) throw new Error('Missing required field: id')
            const { data, error } = await supabase
                .from('tracked_products')
                .update(updates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single()
            if (error) throw error
            return ok(data)
        }

        if (method === 'DELETE') {
            const params = Object.fromEntries(new URL(req.url).searchParams)
            const { id } = params
            if (!id) throw new Error('Missing required parameter: id')
            const { error } = await supabase
                .from('tracked_products')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id)
            if (error) throw error
            return ok({ deleted: true })
        }

        throw new Error(`Method ${method} not allowed`)
    } catch (e) {
        return err(e)
    }
})
