import { z } from 'zod'
import { MARK_STATE_VALUES, MODULE_ID_VALUES } from '@/constants/app-state'

export const ModuleIdSchema = z.enum(MODULE_ID_VALUES)

export const MarkStateSchema = z.enum(MARK_STATE_VALUES)

export const MarkedProductSchema = z.object({
    asin: z.string().min(1),
    name: z.string().min(1),
    markState: MarkStateSchema,
    note: z.string().max(500).optional(),
})

export const PuckiContextSchema = z.object({
    currentQuery: z.string().min(1).optional(),
    currentAsin: z.string().min(1).optional(),
    currentModule: ModuleIdSchema.optional(),
})

export const PersistedAppStoreSchema = z.object({
    activeModule: ModuleIdSchema,
    markedProducts: z.record(MarkedProductSchema),
    puckiContext: PuckiContextSchema,
})

export type StoreModuleId = z.infer<typeof ModuleIdSchema>
export type StoreMarkState = z.infer<typeof MarkStateSchema>
export type StoreMarkedProduct = z.infer<typeof MarkedProductSchema>
export type StorePuckiContext = z.infer<typeof PuckiContextSchema>
export type PersistedAppStore = z.infer<typeof PersistedAppStoreSchema>