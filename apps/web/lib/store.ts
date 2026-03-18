'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createResearchGraphSlice } from '@puckora/research-graph'
import type { ResearchGraphSlice } from '@puckora/research-graph'
import {
    DEFAULT_ACTIVE_MODULE,
    PUCKORA_STORE_NAME,
    type ModuleId,
} from '@/constants/app-state'
import {
    MarkedProductSchema,
    PersistedAppStoreSchema,
    PuckiContextSchema,
    type StoreMarkedProduct,
    type StorePuckiContext,
} from '@/schemas/store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MarkedProduct = StoreMarkedProduct

export type PuckiContext = StorePuckiContext

type PersistedAppStoreShape = Pick<AppStore, 'activeModule' | 'markedProducts' | 'puckiContext'>

function parsePersistedAppStore(persisted: unknown): Partial<PersistedAppStoreShape> {
    const persistedState =
        persisted && typeof persisted === 'object' && 'state' in persisted
            ? (persisted as { state?: unknown }).state
            : persisted

    const parsed = PersistedAppStoreSchema.safeParse(persistedState)
    if (!parsed.success) return {}

    return parsed.data
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

            activeModule: DEFAULT_ACTIVE_MODULE,
            setActiveModule: (moduleId) => set({ activeModule: moduleId }),

            markedProducts: {},
            markProduct: (product) => set((state) => {
                const parsedProduct = MarkedProductSchema.parse(product)
                return {
                    markedProducts: { ...state.markedProducts, [parsedProduct.asin]: parsedProduct },
                }
            }),
            unmarkProduct: (asin) => set((state) => {
                const nextMarkedProducts = { ...state.markedProducts }
                delete nextMarkedProducts[asin]
                return { markedProducts: nextMarkedProducts }
            }),

            puckiContext: {},
            setPuckiContext: (context) => set((state) => ({
                puckiContext: PuckiContextSchema.parse({ ...state.puckiContext, ...context }),
            })),
        }),
        {
            name: PUCKORA_STORE_NAME,
            partialize: (state): PersistedAppStoreShape => ({
                activeModule: state.activeModule,
                markedProducts: state.markedProducts,
                puckiContext: state.puckiContext,
            }),
            merge: (persisted, current) => ({
                ...current,
                ...parsePersistedAppStore(persisted),
            }),
        },
    ),
)
