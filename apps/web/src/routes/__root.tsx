import React from 'react'
import { createRootRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'

export const Route = createRootRoute({
    beforeLoad: async ({ location }) => {
        // All /auth/* routes are public — always accessible
        if (location.pathname.startsWith('/auth/')) return

        // Check session for all other routes
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
            throw redirect({
                to: '/auth/login',
                search: {
                    redirect: location.pathname !== '/' ? location.pathname : undefined,
                    email: undefined,
                    error: undefined,
                },
            })
        }
    },
    component: AppShell,
})

