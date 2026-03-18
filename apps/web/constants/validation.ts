export const VALIDATION_FIELD_KEYS = {
    EMAIL: 'email',
    PASSWORD: 'password',
    CONFIRM_PASSWORD: 'confirmPassword',
    KEYWORD: 'keyword',
    MARKETPLACE: 'marketplace',
    ASIN: 'asin',
} as const

export const AUTH_VALIDATION_MESSAGES = {
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Please enter a valid email address',
    PASSWORD_REQUIRED: 'Password is required',
    PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters',
    PASSWORD_LETTER_REQUIRED: 'Password must contain at least one letter',
    PASSWORD_NUMBER_REQUIRED: 'Password must contain at least one number',
    CONFIRM_PASSWORD_REQUIRED: 'Please confirm your password',
    PASSWORD_MISMATCH: 'Passwords do not match',
} as const

export const SCRAPE_VALIDATION_MESSAGES = {
    KEYWORD_REQUIRED: 'Search term is required',
    KEYWORD_TOO_LONG: 'Search term is too long',
    MARKETPLACE_REQUIRED: 'Marketplace is required',
    ASIN_INVALID: 'Enter a valid 10-character ASIN',
} as const