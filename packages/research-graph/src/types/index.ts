// ─────────────────────────────────────────────────────────────────────────────
// @puckora/research-graph — Domain Types
// ─────────────────────────────────────────────────────────────────────────────

export const GraphNodeType = {
    SESSION: 'session',
    CATEGORY: 'category',
    KEYWORD: 'keyword',
    PRODUCT: 'product',
    SUPPLIER: 'supplier',
    VECTOR: 'vector',
} as const

export type GraphNodeType = typeof GraphNodeType[keyof typeof GraphNodeType]

export interface ResearchNode {
    readonly id: string
    readonly type: GraphNodeType
    readonly label: string
    readonly parentId: string | null
    readonly timestamp: string
    readonly meta: NodeMeta
}

export type NodeMeta = Readonly<{
    query?: string
    asin?: string
    categoryId?: string
    supplierId?: string
    url?: string
}>

export interface SuggestedNode {
    readonly id: string
    readonly type: GraphNodeType
    readonly label: string
    readonly parentId: string
    readonly reason: string
    readonly score: number
    readonly meta: NodeMeta
}

export interface ResearchSession {
    readonly id: string
    readonly startedAt: string
    readonly nodes: readonly ResearchNode[]
    readonly currentId: string | null
}

export interface NodeLayout {
    readonly nodeId: string
    readonly lane: number
    readonly y: number
    readonly cx: number
}

export interface GraphLayout {
    readonly visited: readonly NodeLayout[]
    readonly suggestions: readonly NodeLayout[]
    readonly viewHeight: number
    readonly viewWidth: number
    readonly totalLanes: number
}

export interface NavigateEvent {
    readonly nodeId: string
    readonly node: ResearchNode
}

export interface FollowSuggestionEvent {
    readonly suggestion: SuggestedNode
}

export interface RenderGraphInput {
    readonly svg: SVGSVGElement
    readonly tooltip: HTMLElement
    readonly nodes: readonly ResearchNode[]
    readonly currentId: string | null
    readonly suggestions: readonly SuggestedNode[]
    readonly onNavigate: (event: NavigateEvent) => void
    readonly onFollowSuggestion: (event: FollowSuggestionEvent) => void
}

export interface ResearchGraphProps {
    readonly onNavigate?: (event: NavigateEvent) => void
    readonly onFollowSuggestion?: (event: FollowSuggestionEvent) => void
    readonly height?: string
    readonly className?: string
}

export interface ResearchGraphSlice {
    readonly researchSession: ResearchSession | null
    readonly suggestions: readonly SuggestedNode[]
    startSession: () => void
    addNode: (input: AddNodeInput) => string
    setCurrentNode: (id: string) => void
    setSuggestions: (suggestions: readonly SuggestedNode[]) => void
    resetSession: () => void
}

export type AddNodeInput = Readonly<{
    type: GraphNodeType
    label: string
    parentId: string | null
    meta?: NodeMeta
}>

export interface SuggestionsRequest {
    readonly nodeType: GraphNodeType
    readonly nodeMeta: NodeMeta
    readonly sessionId: string
    readonly history: readonly Pick<ResearchNode, 'type' | 'meta'>[]
}

export interface SuggestionsResponse {
    readonly suggestions: readonly Omit<SuggestedNode, 'id' | 'parentId'>[]
}

export interface UseResearchGraphReturn {
    readonly session: ResearchSession | null
    readonly suggestions: readonly SuggestedNode[]
    readonly currentNode: ResearchNode | null
    ensureSession: () => void
    trackSearch: (query: string, parentId?: string) => string
    trackCategory: (name: string, categoryId: string, parentId?: string) => string
    trackProduct: (title: string, asin: string, parentId: string) => string
    trackSupplier: (name: string, supplierId: string, parentId: string) => string
    trackVectorSuggestion: (label: string, parentId: string) => string
    followSuggestion: (suggestion: SuggestedNode) => string
}
