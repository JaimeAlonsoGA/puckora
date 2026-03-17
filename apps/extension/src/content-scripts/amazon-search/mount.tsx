/**
 * Amazon search overlay — mounts the Puckora sidebar into a shadow root
 * so extension styles never bleed into (or from) the host page.
 *
 * The sidebar is a full React app rendered inside the shadow DOM.
 * @puckora/ui tokens are injected inline as a <style> element.
 */
import { createRoot } from 'react-dom/client'
import { Providers } from '@/providers'
import { SidebarApp } from '@/panels/sidebar/App'
import sidebarStyles from '@/styles/sidebar.css?inline'
import { setupI18n } from '@/i18n/setup'

// Initialise synchronously so translations are ready when React renders.
setupI18n()

/**
 * Mount the Puckora sidebar overlay on the current page.
 * Calling this multiple times is safe — it checks for an existing host element.
 */
export function mountOverlay(): void {
    const MOUNT_ID = '__puckora-sidebar-host'
    if (document.getElementById(MOUNT_ID)) return

    // 1. Create host element and attach shadow root
    const host = document.createElement('div')
    host.id = MOUNT_ID
    document.body.appendChild(host)

    const shadow = host.attachShadow({ mode: 'open' })

    // 2. Inject design tokens inline — avoids chrome-extension:// URL resolution
    const style = document.createElement('style')
    style.textContent = sidebarStyles
    shadow.appendChild(style)

    // 3. Create a mount div inside shadow root and render the React sidebar
    const mountDiv = document.createElement('div')
    mountDiv.id = 'root'
    shadow.appendChild(mountDiv)

    createRoot(mountDiv).render(
        <Providers>
            <SidebarApp />
        </Providers>,
    )
}
