import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { PuckiBar } from '@/components/layout/pucki-bar'
import { ExtensionSync } from '@/components/layout/extension-sync'

type AppShellProps = {
    children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="flex h-screen overflow-hidden bg-muted">
            <ExtensionSync />
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
                <Topbar />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
                <PuckiBar />
            </div>
        </div>
    )
}
