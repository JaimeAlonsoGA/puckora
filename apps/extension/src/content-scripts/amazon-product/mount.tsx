/**
 * Amazon product overlay — mounts the Puckora sidebar into a shadow root.
 * Same mounting strategy as amazon-search/mount.tsx.
 */
import { createRoot } from 'react-dom/client'
import { Providers } from '@/providers'
import { SidebarApp } from '@/panels/sidebar/App'
import sidebarStyles from '@/styles/sidebar.css?inline'
import { setupI18n } from '@/i18n/setup'

setupI18n()

export function mountOverlay(): void {
    const MOUNT_ID = '__puckora-sidebar-host'
    if (document.getElementById(MOUNT_ID)) return

    const host = document.createElement('div')
    host.id = MOUNT_ID
    document.body.appendChild(host)

    const shadow = host.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = sidebarStyles
    shadow.appendChild(style)

    const mountDiv = document.createElement('div')
    mountDiv.id = 'root'
    shadow.appendChild(mountDiv)

    createRoot(mountDiv).render(
        <Providers>
            <SidebarApp />
        </Providers>,
    )
}
