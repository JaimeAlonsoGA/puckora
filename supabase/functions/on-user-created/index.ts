import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { ok, err } from '../_shared/response.ts'

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        // This function is called by a Supabase DB trigger (auth.users INSERT)
        // It is authenticated as the service-role (no user JWT needed)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        )

        const { record } = await req.json() as { record: { id: string; email: string } }

        const { error } = await supabase.from('profiles').insert({
            id: record.id,
            email: record.email,
            plan: 'free',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })

        if (error) throw error

        return ok({ created: true })
    } catch (e) {
        return err(e)
    }
})
