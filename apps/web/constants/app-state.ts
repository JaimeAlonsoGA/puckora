import type { ComponentProps } from 'react'
import { Badge } from '@puckora/ui'

export const MODULE_IDS = {
    SEARCH: 'search',
    SUPPLIERS: 'suppliers',
    NOTEBOOK: 'notebook',
    TOOLS: 'tools',
    PUCKI: 'pucki',
} as const

export const MODULE_ID_VALUES = [
    MODULE_IDS.SEARCH,
    MODULE_IDS.SUPPLIERS,
    MODULE_IDS.NOTEBOOK,
    MODULE_IDS.TOOLS,
    MODULE_IDS.PUCKI,
] as const

export type ModuleId = (typeof MODULE_ID_VALUES)[number]

export const DEFAULT_ACTIVE_MODULE = MODULE_IDS.SEARCH
export const PUCKORA_STORE_NAME = 'puckora-store'

export const MARK_STATES = {
    INTERESTED: 'interested',
    COMPETITOR: 'competitor',
    INVESTIGATE: 'investigate',
} as const

export const MARK_STATE_VALUES = [
    MARK_STATES.INTERESTED,
    MARK_STATES.COMPETITOR,
    MARK_STATES.INVESTIGATE,
] as const

export type MarkState = (typeof MARK_STATE_VALUES)[number]

export const MARK_STATE_CYCLE = [null, ...MARK_STATE_VALUES] as const

export const MARK_STATE_BADGE_VARIANTS = {
    [MARK_STATES.INTERESTED]: 'success',
    [MARK_STATES.COMPETITOR]: 'warning',
    [MARK_STATES.INVESTIGATE]: 'default',
} as const satisfies Record<MarkState, ComponentProps<typeof Badge>['variant']>

export const MARK_STATE_DOT_CLASS_NAMES: Record<MarkState, string> = {
    [MARK_STATES.INTERESTED]: 'bg-primary',
    [MARK_STATES.COMPETITOR]: 'bg-warning-fg',
    [MARK_STATES.INVESTIGATE]: 'bg-faint',
}

export const MARK_STATE_BUTTON_CLASS_NAMES: Record<MarkState, string> = {
    [MARK_STATES.INTERESTED]: 'bg-success-surface text-success-fg border-transparent',
    [MARK_STATES.COMPETITOR]: 'bg-warning-surface text-warning-fg border-transparent',
    [MARK_STATES.INVESTIGATE]: 'bg-card text-faint border-transparent',
}