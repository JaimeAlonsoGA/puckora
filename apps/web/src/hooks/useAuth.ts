import { useEffect, useState, useCallback } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface AuthState {
    user: User | null
    session: Session | null
    loading: boolean
}

export interface AuthActions {
    signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
    signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null; needsVerification: boolean }>
    signInWithGoogle: () => Promise<{ error: AuthError | null }>
    signInWithAmazon: () => Promise<{ error: AuthError | null }>
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>
    updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>
    resendVerification: (email: string) => Promise<{ error: AuthError | null }>
    signOut: () => Promise<void>
}

const SITE_URL = import.meta.env.VITE_SITE_URL ?? window.location.origin

export function useAuth(): AuthState & AuthActions {
    const [state, setState] = useState<AuthState>({
        user: null,
        session: null,
        loading: true,
    })

    // Note: useEffect is intentional here — manages the Supabase auth subscription
    // (event listener), NOT data fetching. This is the only permitted exception to
    // the "no useEffect + fetch" rule in this codebase.
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setState({
                user: data.session?.user ?? null,
                session: data.session,
                loading: false,
            })
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setState({
                user: session?.user ?? null,
                session,
                loading: false,
            })
        })

        return () => subscription.unsubscribe()
    }, [])

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error }
    }, [])

    const signUpWithEmail = useCallback(async (email: string, password: string, fullName?: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${SITE_URL}/auth/callback`,
                data: fullName ? { full_name: fullName } : undefined,
            },
        })
        const needsVerification = !error && !data.session

        // Resolve referral code if present
        if (!error && data.user?.id) {
            try {
                const code = localStorage.getItem('sf:referral_code')
                if (code) {
                    await supabase.rpc('resolve_referral', {
                        p_code: code,
                        p_new_user_id: data.user.id,
                    })
                    localStorage.removeItem('sf:referral_code')
                }
            } catch { /* referral resolution is best-effort */ }
        }

        return { error, needsVerification }
    }, [])

    const signInWithGoogle = useCallback(async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${SITE_URL}/auth/callback` },
        })
        return { error }
    }, [])

    const signInWithAmazon = useCallback(async () => {
        // Amazon Login with Amazon (LWA) — requires custom provider configured in Supabase
        // Provider slug: 'amazon' (must be enabled in Supabase Auth > Providers > Amazon)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'amazon' as Parameters<typeof supabase.auth.signInWithOAuth>[0]['provider'],
            options: { redirectTo: `${SITE_URL}/auth/callback` },
        })
        return { error }
    }, [])

    const resetPassword = useCallback(async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${SITE_URL}/auth/reset-password`,
        })
        return { error }
    }, [])

    const updatePassword = useCallback(async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        return { error }
    }, [])

    const resendVerification = useCallback(async (email: string) => {
        const { error } = await supabase.auth.resend({ type: 'signup', email })
        return { error }
    }, [])

    const signOut = useCallback(async () => {
        // Clear product context from sessionStorage on sign-out
        try { sessionStorage.removeItem('sf:product-context') } catch { /* noop */ }
        await supabase.auth.signOut()
        window.location.href = '/auth/login'
    }, [])

    return { ...state, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithAmazon, resetPassword, updatePassword, resendVerification, signOut }
}
