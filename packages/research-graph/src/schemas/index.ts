// ─────────────────────────────────────────────────────────────────────────────
// @puckora/research-graph — Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { GraphNodeType } from '../types'

export const GraphNodeTypeSchema = z.enum([
    GraphNodeType.SESSION,
    GraphNodeType.CATEGORY,
    GraphNodeType.KEYWORD,
    GraphNodeType.PRODUCT,
    GraphNodeType.SUPPLIER,
    GraphNodeType.VECTOR,
])

export const NodeMetaSchema = z.object({
    query: z.string().max(500).optional(),
    asin: z.string().optional(),
    categoryId: z.string().optional(),
    supplierId: z.string().max(100).optional(),
    url: z.string().url().optional(),
}).strict()

export const ResearchNodeSchema = z.object({
    id: z.string(),
    type: GraphNodeTypeSchema,
    label: z.string().min(1).max(60),
    parentId: z.string().nullable(),
    timestamp: z.string().datetime(),
    meta: NodeMetaSchema,
}).strict()

export const SuggestedNodeSchema = z.object({
    id: z.string(),
    type: GraphNodeTypeSchema,
    label: z.string().min(1).max(60),
    parentId: z.string(),
    reason: z.string().min(1).max(200),
    score: z.number().min(0).max(1),
    meta: NodeMetaSchema,
}).strict()

export const ResearchSessionSchema = z.object({
    id: z.string(),
    startedAt: z.string().datetime(),
    nodes: z.array(ResearchNodeSchema).min(1),
    currentId: z.string().nullable(),
}).strict()

export const SuggestionsRequestSchema = z.object({
    nodeType: GraphNodeTypeSchema,
    nodeMeta: NodeMetaSchema,
    sessionId: z.string(),
    history: z.array(z.object({
        type: GraphNodeTypeSchema,
        meta: NodeMetaSchema,
    })).max(50),
}).strict()

export const SuggestionsResponseSchema = z.object({
    suggestions: z.array(
        SuggestedNodeSchema.omit({ id: true, parentId: true })
    ).max(6),
}).strict()

export const AddNodeInputSchema = z.object({
    type: GraphNodeTypeSchema,
    label: z.string().min(1).max(60),
    parentId: z.string().nullable(),
    meta: NodeMetaSchema.optional().default({}),
}).strict()

export type SuggestionsApiResponse = z.infer<typeof SuggestionsResponseSchema>
