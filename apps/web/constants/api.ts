export const API_STATUS = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    INTERNAL_SERVER_ERROR: 500,
} as const

export const API_ERROR_MESSAGES = {
    KEYWORD_REQUIRED: 'keyword is required',
    UNAUTHORIZED: 'Unauthorized',
    INTERNAL_ERROR: 'Internal error',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    INVALID_MARKETPLACE: 'Invalid marketplace',
    INVALID_JSON_BODY: 'Invalid JSON body',
    VALIDATION_FAILED: 'Validation failed',
    SCRAPER_BLOCKED: 'Scraper was blocked on this page',
    UPSERT_FAILED: 'upsert failed',
} as const

export const QUERY_ERROR_MESSAGES = {
    CATEGORIES_FETCH_FAILED: 'Failed to fetch categories',
    KEYWORD_RESULTS_FETCH_FAILED: 'Failed to fetch keyword results',
    PRODUCT_FETCH_FAILED: 'Failed to fetch product',
    USER_FETCH_FAILED: 'Failed to fetch user',
    SCRAPE_JOB_FETCH_FAILED: 'Failed to fetch scrape job',
} as const

export const SERVICE_ERROR_PREFIXES = {
    CREATE_SCRAPE_JOB_FAILED: 'createScrapeJob failed',
    GET_SCRAPE_JOB_FAILED: 'getScrapeJob failed',
    LIST_PENDING_SCRAPE_JOBS_FAILED: 'listPendingScrapeJobs failed',
    UPDATE_SCRAPE_JOB_FAILED: 'updateScrapeJob failed',
    GET_USER_FAILED: 'Failed to fetch user',
    UPDATE_USER_FAILED: 'Failed to update user',
} as const