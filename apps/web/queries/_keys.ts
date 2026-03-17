/**
 * Central query key registry.
 *
 * Rules:
 * - All keys live here. Never define queryKey inline in a hook.
 * - Keys are hierarchical: invalidating `keys.all` busts everything in that domain.
 * - Keys are `as const` so narrowest type is inferred.
 */

export const userKeys = {
    all: ['user'] as const,
    me: () => [...userKeys.all, 'me'] as const,
}

export const productKeys = {
    all: ['products'] as const,
    detail: (asin: string) => [...productKeys.all, 'detail', asin] as const,
}

export const categoryKeys = {
    all: ['categories'] as const,
    byMarketplace: (marketplace: string) =>
        [...categoryKeys.all, marketplace] as const,
    detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
    topLevel: (marketplace: string) =>
        [...categoryKeys.byMarketplace(marketplace), 'topLevel'] as const,
}

export const scrapeKeys = {
    all: ['scrape_jobs'] as const,
    detail: (jobId: string) => [...scrapeKeys.all, 'detail', jobId] as const,
    pending: () => [...scrapeKeys.all, 'pending'] as const,
}

export const keywordKeys = {
    all: ['keywords'] as const,
    results: (keyword: string, marketplace: string) =>
        [...keywordKeys.all, 'results', keyword, marketplace] as const,
}

