import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { AppRoute } from '@/constants/routes'
import { CookieName } from '@/constants/cookies'
import { DEFAULT_LANGUAGE, SUPPORTED_LOCALES } from '@puckora/types'

type CookieOptions = {
    domain?: string
    expires?: Date | number
    httpOnly?: boolean
    maxAge?: number
    path?: string
    priority?: 'low' | 'medium' | 'high'
    sameSite?: true | false | 'lax' | 'strict' | 'none'
    secure?: boolean
    partitioned?: boolean
}

const PUBLIC_ROUTES: string[] = [AppRoute.login, AppRoute.signup, '/api/webhooks']

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value),
                    )
                    response = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    )
                },
            },
        },
    )

    // getClaims() validates the JWT signature locally against Supabase's
    // published JWKS keys — no network round-trip to the auth server.
    // This is the recommended approach for middleware per Supabase SSR docs:
    // "Always use getClaims() to protect pages. Never trust getSession() inside
    // server code such as Proxy. getClaims() validates the JWT signature every time."
    const { data: claimsData } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub

    // Seed the NEXT_LOCALE cookie from the user's stored language preference
    // whenever the cookie is absent (first login or new browser).
    // This is a lightweight single-column query and only runs once per session.
    if (userId && !request.cookies.has(CookieName.locale)) {
        const { data: user } = await supabase
            .from('users')
            .select('language')
            .eq('id', userId)
            .single()
        const prefs = { language: user?.language } as { language?: string }
        const lang = (SUPPORTED_LOCALES as readonly string[]).includes(prefs.language ?? '')
            ? prefs.language!
            : DEFAULT_LANGUAGE
        response.cookies.set(CookieName.locale, lang, {
            path: '/',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365,
        })
    }

    const { pathname } = request.nextUrl

    // Allow public routes
    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

    if (!userId && !isPublicRoute) {
        const url = request.nextUrl.clone()
        url.pathname = AppRoute.login
        return NextResponse.redirect(url)
    }

    if (userId && (pathname === AppRoute.login || pathname === AppRoute.signup)) {
        const url = request.nextUrl.clone()
        url.pathname = AppRoute.home
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
}
