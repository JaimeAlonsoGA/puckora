'use server'

/**
 * Auth Server Actions
 *
 * Each action accepts pre-validated, typed data from react-hook-form on the
 * client. Zod validation runs client-side first (via useFormAction), so these
 * actions are a thin, secure layer that:
 *  - Runs exclusively on the server (credentials never touch client state)
 *  - Returns { error } on auth failure so the client can surface it
 *  - Calls redirect() on success so the browser navigates server-side
 */

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppRoute } from '@/lib/routes'
import type { LoginFormValues, SignupFormValues } from '@/lib/schemas/auth'
import type { ActionResult } from '@/hooks/use-form-action'

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function loginAction(data: LoginFormValues): Promise<ActionResult> {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
    })

    if (error) {
        return { error: error.message }
    }

    redirect(AppRoute.home)
}

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

export async function signupAction(data: SignupFormValues): Promise<ActionResult> {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
    })

    if (error) {
        return { error: error.message }
    }

    redirect(AppRoute.home)
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOutAction(): Promise<never> {
    const supabase = await createServerClient()
    await supabase.auth.signOut()
    redirect(AppRoute.login)
}
