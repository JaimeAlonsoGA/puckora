// @puckora/research-graph — Public API

export { ResearchGraph } from './components/ResearchGraph'

export { createResearchGraphSlice } from './lib/store-slice'
export { useResearchGraph } from './lib/use-research-graph'
export type { StoreSelector } from './lib/use-research-graph'

export type {
    ResearchGraphSlice,
    ResearchGraphProps,
    ResearchSession,
    ResearchNode,
    SuggestedNode,
    AddNodeInput,
    NavigateEvent,
    FollowSuggestionEvent,
    UseResearchGraphReturn,
    GraphNodeType,
    SuggestionsRequest,
    SuggestionsResponse,
} from './types'

export type { SuggestionsApiResponse } from './schemas'

export { GraphNodeType as GraphNodeTypeEnum } from './types'

export {
    SuggestionsRequestSchema,
    SuggestionsResponseSchema,
} from './schemas'
