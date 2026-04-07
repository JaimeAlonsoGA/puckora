export const API_STATUS = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
} as const

export const API_ERROR_MESSAGES = {
    KEYWORD_REQUIRED: 'keyword is required',
    ASIN_REQUIRED: 'asin is required',
    ASIN_INVALID: 'asin is invalid',
    INVALID_INPUT: 'Invalid input',
    INVALID_SEARCH_INPUT: 'Invalid search input',
    UNAUTHORIZED: 'Unauthorized',
    INTERNAL_ERROR: 'Internal error',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    INVALID_MARKETPLACE: 'Invalid marketplace',
    INVALID_JSON_BODY: 'Invalid JSON body',
    VALIDATION_FAILED: 'Validation failed',
    PROFILE_UPDATE_FAILED: 'Failed to update profile',
    SEARCH_JOB_CREATE_FAILED: 'Failed to create search job',
    KEYWORD_SEARCH_FAILED: 'SP-API keyword search failed',
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
    UPDATE_AMAZON_PRODUCT_FAILED: 'updateAmazonProduct failed',
} as const