/**
 * Analysis store — current page analysis state.
 *
 * Set by content scripts after parsing the page / receiving enrichment data.
 * Read by the sidebar React components.
 */
import { create } from 'zustand'
import type { AnalysisResult } from '@/types/extension'

type AnalysisStatus = 'idle' | 'loading' | 'done' | 'error'

interface AnalysisState {
    status: AnalysisStatus
    result: AnalysisResult | null
    error: string | null
    setLoading: () => void
    setResult: (result: AnalysisResult) => void
    setError: (error: string) => void
    reset: () => void
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
    status: 'idle',
    result: null,
    error: null,

    setLoading: () => set({ status: 'loading', error: null }),
    setResult: (result) => set({ status: 'done', result, error: null }),
    setError: (error) => set({ status: 'error', error }),
    reset: () => set({ status: 'idle', result: null, error: null }),
}))
