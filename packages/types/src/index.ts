// GENERATED — Do not hand-edit. Run `npm run gen:types` to regenerate.

import type { Database } from './database.types'
export type { Database }
export type { Json } from './database.types'
export * from './catalog.types'
export * from './meta.types'

// Generic type helpers
type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]
type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"]
export type { Tables, TablesInsert, TablesUpdate, Enums, Views }

// Tables
export type ScrapeJob = Tables<"scrape_jobs">
export type ScrapeJobInsert = TablesInsert<"scrape_jobs">
export type ScrapeJobUpdate = TablesUpdate<"scrape_jobs">

export type User = Tables<"users">
export type UserInsert = TablesInsert<"users">
export type UserUpdate = TablesUpdate<"users">

// Views
export type ScrapeProgress = Views<"scrape_progress">

// Enum types
export type ScrapeExecutor = Enums<"scrape_executor">
export type ScrapeJobStatus = Enums<"scrape_job_status">
export type ScrapeJobType = Enums<"scrape_job_type">

// Enum const objects
export const ScrapeExecutorEnum = {
    EXTENSION: "extension",
    AGENT: "agent"
} as const

export const ScrapeJobStatusEnum = {
    PENDING: "pending",
    CLAIMED: "claimed",
    RUNNING: "running",
    DONE: "done",
    FAILED: "failed"
} as const

export const ScrapeJobTypeEnum = {
    AMAZON_SEARCH: "amazon_search",
    AMAZON_PRODUCT: "amazon_product",
    ALIBABA_SEARCH: "alibaba_search"
} as const

export const EnumNames = {
    SCRAPEEXECUTOR: "scrapeExecutor",
    SCRAPEJOBSTATUS: "scrapeJobStatus",
    SCRAPEJOBTYPE: "scrapeJobType"
} as const
