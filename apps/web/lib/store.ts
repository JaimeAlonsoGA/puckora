'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createResearchGraphSlice } from '@puckora/research-graph'
import type { ResearchGraphSlice } from '@puckora/research-graph'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModuleId = 'search' | 'suppliers' | 'notebook' | 'tools' | 'pucki'

export type MarkState = 'interested' | 'competitor' | 'investigate'

export interface MarkedProduct {
    asin: string
    name: string
    markState: MarkState
    note?: string
}

export interface PuckiContext {
    currentQuery?: string
    currentAsin?: string
    currentModule?: string
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface AppStore extends ResearchGraphSlice {
    activeModule: ModuleId
    setActiveModule: (m: ModuleId) => void

    markedProducts: Record<string, MarkedProduct>
    markProduct: (product: MarkedProduct) => void
    unmarkProduct: (asin: string) => void

    puckiContext: PuckiContext
    setPuckiContext: (ctx: Partial<PuckiContext>) => void
}

export const useAppStore = create<AppStore>()(
    persist(
        (set, get, api) => ({
            ...createResearchGraphSlice(set, get, api),

            activeModule: 'search',
            setActiveModule: (m) => set({ activeModule: m }),

            markedProducts: {},
            markProduct: (p) => set((s) => ({
                markedProducts: { ...s.markedProducts, [p.asin]: p },
            })),
            unmarkProduct: (asin) => set((s) => {
                const { [asin]: _, ...rest } = s.markedProducts
                return { markedProducts: rest }
            }),

            puckiContext: {},
            setPuckiContext: (ctx) => set((s) => ({
                puckiContext: { ...s.puckiContext, ...ctx },
            })),
        }),
        { name: 'puckora-store' },
    ),
)
