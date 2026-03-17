/**
 * Sidebar store — overlay open/closed state and active tab.
 *
 * Used by both the content-script host (to control visibility) and the
 * React sidebar app (to read active tab + toggle state).
 */
import { create } from 'zustand'
import type { SidebarTab } from '@/types/extension'

interface SidebarState {
    isOpen: boolean
    activeTab: SidebarTab
    open: () => void
    close: () => void
    toggle: () => void
    setTab: (tab: SidebarTab) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
    isOpen: false,
    activeTab: 'analysis',

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((s) => ({ isOpen: !s.isOpen })),
    setTab: (activeTab) => set({ activeTab }),
}))
