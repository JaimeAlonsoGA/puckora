// ─────────────────────────────────────────────────────────────────────────────
// @puckora/research-graph — Store Slice
// Designed to be composed into your existing Zustand store via slice pattern.
// Never import this directly in components — use the hook instead.
// ─────────────────────────────────────────────────────────────────────────────

import type { StateCreator } from 'zustand'
import type {
    ResearchGraphSlice,
    ResearchSession,
    ResearchNode,
    SuggestedNode,
    AddNodeInput,
} from '../types'
import { AddNodeInputSchema } from '../schemas'
import { SESSION } from '../constants'
import { generateId } from '../utils'

export const createResearchGraphSlice: StateCreator<
    ResearchGraphSlice,
    [],
    [],
    ResearchGraphSlice
> = (set, get) => ({

    researchSession: null,
    suggestions: [],

    startSession: () => {
        if (get().researchSession !== null) return

        const sessionId = generateId()
        const rootNode: ResearchNode = {
            id: SESSION.ROOT_ID,
            type: 'session',
            label: 'Started exploring',
            parentId: null,
            timestamp: new Date().toISOString(),
            meta: {},
        }

        const session: ResearchSession = {
            id: sessionId,
            startedAt: new Date().toISOString(),
            nodes: [rootNode],
            currentId: SESSION.ROOT_ID,
        }

        set({ researchSession: session, suggestions: [] })
    },

    addNode: (input: AddNodeInput): string => {
        const parsed = AddNodeInputSchema.safeParse(input)
        if (!parsed.success) {
            console.error('[ResearchGraph] Invalid addNode input:', parsed.error.flatten())
            return ''
        }

        const currentSession = get().researchSession
        if (!currentSession) {
            console.warn('[ResearchGraph] addNode called before startSession')
            return ''
        }

        const id = generateId()
        const newNode: ResearchNode = {
            id,
            type: parsed.data.type,
            label: parsed.data.label,
            parentId: parsed.data.parentId,
            timestamp: new Date().toISOString(),
            meta: parsed.data.meta ?? {},
        }

        set((state) => ({
            researchSession: state.researchSession
                ? {
                    ...state.researchSession,
                    currentId: id,
                    nodes: [...state.researchSession.nodes, newNode],
                }
                : null,
            suggestions: [],
        }))

        return id
    },

    setCurrentNode: (id: string): void => {
        set((state) => ({
            researchSession: state.researchSession
                ? { ...state.researchSession, currentId: id }
                : null,
        }))
    },

    setSuggestions: (suggestions: readonly SuggestedNode[]): void => {
        set({ suggestions: [...suggestions] })
    },

    resetSession: (): void => {
        set({ researchSession: null, suggestions: [] })
    },
})
