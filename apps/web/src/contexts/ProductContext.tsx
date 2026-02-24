import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AmazonProduct } from '@repo/types'
import type { AlibabaProductResult } from '@repo/types'
import type { CostCalculationDraft, ResearchState } from '@repo/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductContextValue {
    /** The product currently in focus across all modules */
    activeProduct: AmazonProduct | null
    /** The supplier currently in focus (set from Sourcing Bridge) */
    activeSupplier: AlibabaProductResult | null
    /** In-progress cost calculation, preserved across navigation */
    costDraft: CostCalculationDraft | null
    /** Last Research module state (keyword + filters + results) */
    researchState: ResearchState | null
    /** Name of the last module that touched the active product (for "continue" UI) */
    lastModuleUsed: string | null

    setActiveProduct: (product: AmazonProduct | null) => void
    setActiveSupplier: (supplier: AlibabaProductResult | null) => void
    updateCostDraft: (patch: Partial<CostCalculationDraft>) => void
    setResearchState: (state: ResearchState | null) => void
    clearAll: () => void
    markModuleUsed: (module: string) => void
}

// ---------------------------------------------------------------------------
// Session storage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'sf:product-context'

interface PersistedState {
    activeProduct: AmazonProduct | null
    activeSupplier: AlibabaProductResult | null
    costDraft: CostCalculationDraft | null
    researchState: ResearchState | null
    lastModuleUsed: string | null
}

function loadFromStorage(): PersistedState {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (!raw) return emptyState()
        return JSON.parse(raw) as PersistedState
    } catch {
        return emptyState()
    }
}

function saveToStorage(state: PersistedState): void {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
        // sessionStorage full or unavailable — silently ignore
    }
}

function emptyState(): PersistedState {
    return {
        activeProduct: null,
        activeSupplier: null,
        costDraft: null,
        researchState: null,
        lastModuleUsed: null,
    }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ProductContext = createContext<ProductContextValue | null>(null)

export function ProductContextProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<PersistedState>(emptyState)

    // Hydrate from sessionStorage on mount
    useEffect(() => {
        setState(loadFromStorage())
    }, [])

    // Persist to sessionStorage on every state change
    useEffect(() => {
        saveToStorage(state)
    }, [state])

    const setActiveProduct = useCallback((product: AmazonProduct | null) => {
        setState(s => ({ ...s, activeProduct: product }))
    }, [])

    const setActiveSupplier = useCallback((supplier: AlibabaProductResult | null) => {
        setState(s => ({ ...s, activeSupplier: supplier }))
    }, [])

    const updateCostDraft = useCallback((patch: Partial<CostCalculationDraft>) => {
        setState(s => ({
            ...s,
            costDraft: { ...(s.costDraft ?? {}), ...patch },
        }))
    }, [])

    const setResearchState = useCallback((researchState: ResearchState | null) => {
        setState(s => ({ ...s, researchState }))
    }, [])

    const markModuleUsed = useCallback((module: string) => {
        setState(s => ({ ...s, lastModuleUsed: module }))
    }, [])

    const clearAll = useCallback(() => {
        setState(emptyState())
        try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
    }, [])

    return (
        <ProductContext.Provider
            value={{
                ...state,
                setActiveProduct,
                setActiveSupplier,
                updateCostDraft,
                setResearchState,
                clearAll,
                markModuleUsed,
            }}
        >
            {children}
        </ProductContext.Provider>
    )
}

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

export function useProductContext(): ProductContextValue {
    const ctx = useContext(ProductContext)
    if (!ctx) {
        throw new Error(
            'useProductContext must be used inside <ProductContextProvider>. ' +
            'Make sure ProductContextProvider wraps AppShell.',
        )
    }
    return ctx
}
