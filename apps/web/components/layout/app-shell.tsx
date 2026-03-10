import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

type AppShellProps = {
    children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="flex h-screen overflow-hidden bg-[color:var(--surface-base)]">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
