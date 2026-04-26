import { z } from 'zod'
import { ScrapedListingSchema } from '@puckora/scraper-core'

export const SearchListingSnapshotSchema = ScrapedListingSchema.extend({
    main_image_url: z.string().nullable(),
})

export const RunKeywordSearchParamsSchema = z.object({
    jobId: z.string().min(1),
    keywordId: z.string().min(1),
    keyword: z.string().min(1).max(500),
    marketplace: z.string().min(2).max(4),
})

export type SearchListingSnapshot = z.infer<typeof SearchListingSnapshotSchema>
export type RunKeywordSearchParams = z.infer<typeof RunKeywordSearchParamsSchema>