/**
 * TabBar — navigation tabs for the sidebar panel.
 *
 * Tabs: Analysis | Suppliers
 */
import { cn } from '@puckora/utils'
import { useTranslation } from 'react-i18next'
import { useSidebarStore } from '@/stores/sidebar.store'
import type { SidebarTab } from '@/types/extension'

const TAB_IDS: SidebarTab[] = ['analysis', 'suppliers']

export function TabBar() {
    const { activeTab, setTab } = useSidebarStore()
    const { t } = useTranslation()

    const TAB_LABELS: Record<SidebarTab, string> = {
        analysis: `📊 ${t('sidebar.tabAnalysis')}`,
        suppliers: `🏭 ${t('sidebar.tabSuppliers')}`,
    }

    return (
        <div role="tablist" className="flex border-b border-border shrink-0">
            {TAB_IDS.map((id) => (
                <button
                    key={id}
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => setTab(id)}
                    className={cn(
                        'flex-1 py-2 px-3 bg-transparent border-0 border-b-2 text-sm cursor-pointer transition-colors duration-150 outline-none',
                        activeTab === id
                            ? 'border-primary text-primary font-semibold'
                            : 'border-transparent text-muted-foreground font-normal hover:text-foreground',
                    )}
                >
                    {TAB_LABELS[id]}
                </button>
            ))}
        </div>
    )
}
