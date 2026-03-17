import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Providers } from '@/providers'
import { App } from './App'
import { setupI18n } from '@/i18n/setup'
import '@/styles/globals.css'

// Initialise synchronously with default locale before React renders.
// Providers will async-detect the stored locale and switch if needed.
setupI18n()

const root = document.getElementById('root')!
createRoot(root).render(
    <StrictMode>
        <Providers>
            <App />
        </Providers>
    </StrictMode>,
)
