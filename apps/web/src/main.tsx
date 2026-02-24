import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { router } from './router'
import './i18n'
import './styles/globals.css'

// Capture referral code from ?ref=CODE URL param and persist to localStorage
try {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
        localStorage.setItem('sf:referral_code', ref)
    }
} catch { /* noop — storage may be unavailable */ }

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Missing #root element')

ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    </React.StrictMode>,
)
