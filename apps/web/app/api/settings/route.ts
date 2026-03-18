import { NextRequest, NextResponse } from 'next/server'
import { API_ERROR_MESSAGES, API_STATUS } from '@/constants/api'
import { createServerClient } from '@/integrations/supabase/server'
import { getUser, updateUser } from '@/services/settings'
import { SettingsUpdateSchema } from '@puckora/types/schemas'
import { CookieName } from '@/constants/cookies'

export async function GET() {
    try {
        const supabase = await createServerClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: API_STATUS.UNAUTHORIZED })
        }

        const profile = await getUser(supabase, user.id)
        return NextResponse.json(profile)
    } catch (err) {
        const message = err instanceof Error ? err.message : API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR
        return NextResponse.json({ error: message }, { status: API_STATUS.INTERNAL_SERVER_ERROR })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const supabase = await createServerClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: API_STATUS.UNAUTHORIZED })
        }

        const body = await req.json()
        const parsed = SettingsUpdateSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: API_ERROR_MESSAGES.VALIDATION_FAILED, details: parsed.error.flatten() },
                { status: API_STATUS.BAD_REQUEST },
            )
        }

        const updated = await updateUser(supabase, user.id, parsed.data)
        const response = NextResponse.json(updated)

        // Keep the NEXT_LOCALE cookie in sync so the i18n layer picks up the
        // new language on the very next server render (triggered by router.refresh()).
        if (parsed.data.language) {
            response.cookies.set(CookieName.locale, parsed.data.language, {
                path: '/',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 365, // 1 year
            })
        }

        return response
    } catch (err) {
        const message = err instanceof Error ? err.message : API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR
        return NextResponse.json({ error: message }, { status: API_STATUS.INTERNAL_SERVER_ERROR })
    }
}
