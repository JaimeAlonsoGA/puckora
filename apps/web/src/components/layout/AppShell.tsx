import React from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ProductContextProvider } from '@/contexts/ProductContext'
import { OnboardingWizard } from '@/pages/onboarding/components/OnboardingWizard'
import { useOnboarding } from '@/hooks/useOnboarding'

function AppShellInner() {
    const { isComplete, isLoading } = useOnboarding()

    return (
        <div style={{ display: 'flex', height: '100%', background: 'var(--sf-bg)' }}>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar />
                <Outlet />
            </div>
            {/* Onboarding wizard — shown once for new users, never again */}
            {!isLoading && !isComplete && <OnboardingWizard />}
        </div>
    )
}

export function AppShell() {
    const location = useRouterState({ select: s => s.location.pathname })
    const isAuthRoute = location.startsWith('/auth/')

    if (isAuthRoute) {
        return <Outlet />
    }

    return (
        <ProductContextProvider>
            <AppShellInner />
        </ProductContextProvider>
    )
}

