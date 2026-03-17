/**
 * Sidebar App — root component for the injected overlay.
 *
 * Rendered inside a shadow DOM root by the content script mount files.
 * Controls the fixed-position panel and routes between tabs.
 */
import { useTranslation } from 'react-i18next'
import { Stack } from '@puckora/ui'
import { useSidebarStore } from '@/stores/sidebar.store'
import { TabBar } from './components/tab-bar'
import { ProductAnalysis } from './screens/product-analysis'
import { SearchResults } from './screens/search-results'
import { SupplierSearch } from './screens/supplier-search'



export function SidebarApp() {
    const { isOpen, toggle, activeTab } = useSidebarStore()
    const { t } = useTranslation()

    return (
        <>
            {/* Floating toggle handle */}
            <button
                className="fixed right-0 top-1/2 -translate-y-1/2 z-[2147483647] bg-primary text-primary-foreground border-0 rounded-l-md w-7 h-16 cursor-pointer flex items-center justify-center text-base leading-none [writing-mode:vertical-rl]"
                onClick={toggle}
                aria-label={isOpen ? t('sidebar.toggleClose') : t('sidebar.toggleOpen')}
            >
                {isOpen ? '›' : '‹'}
            </button>

            {/* Sidebar panel */}
            {isOpen && (
                <div className="fixed inset-y-0 right-0 z-[2147483647] flex flex-col w-[380px] bg-background border-l border-border [box-shadow:-4px_0_24px_rgba(0,0,0,0.12)] overflow-y-auto font-sans text-sm text-foreground">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                        <span className="font-semibold text-base text-foreground">
                            {t('sidebar.title')}
                        </span>
                        <button
                            onClick={toggle}
                            className="bg-transparent border-0 cursor-pointer p-1 text-muted-foreground hover:text-foreground"
                            aria-label={t('sidebar.close')}
                        >
                            ✕
                        </button>
                    </div>

                    <TabBar />

                    {/* Main content */}
                    <Stack className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'analysis' && <ProductAnalysis />}
                        {activeTab === 'suppliers' && <SupplierSearch />}
                    </Stack>
                </div>
            )}
        </>
    )
}
