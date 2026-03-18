import { z } from 'zod'
import { ScrapedListingSchema } from '@puckora/scraper-core'

export const KEYWORD_SEARCH_FETCH_HEADERS = {
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
} as const

export const KEYWORD_SEARCH_ERROR_MESSAGE = {
    HTML_SEARCH_FAILED: 'Amazon HTML fetch failed',
    CATALOG_FETCH_FAILED: 'catalog fetch failed',
    WRITE_FAILED: 'write failed',
    ENRICHMENT_UNAVAILABLE: 'sp-api: enrichment unavailable',
    SEARCH_FAILED: 'Keyword search failed',
} as const

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