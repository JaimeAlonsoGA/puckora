/**
 * Query key factories — single source of truth for all TanStack Query keys
 * in the extension. Mirrors the pattern from apps/web/queries/_keys.ts.
 */
export const productKeys = {
    all: ['products'] as const,
    detail: (asin: string, marketplace?: string) =>
        [...productKeys.all, 'detail', asin, marketplace ?? 'US'] as const,
}

export const scrapeKeys = {
    all: ['scrapeJobs'] as const,
    active: () => [...scrapeKeys.all, 'active'] as const,
    detail: (jobId: string) => [...scrapeKeys.all, 'detail', jobId] as const,
}
