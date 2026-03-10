'use client'

import { createClient } from '@/integrations/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { AppRoute } from '@/constants/routes'

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    // Memoize the client so it is created once per component mount, not every
    // render. Without this the client reference changes on every render which
    // causes the effect below to resubscribe on every render too.
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        // getSession() reads the cached session from storage — no network call.
        // The server already enforces auth (proxy.ts), so client state is for UI only.
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    const signOut = async () => {
        await supabase.auth.signOut()
        router.push(AppRoute.login)
    }

    return { user, loading, signOut }
}
