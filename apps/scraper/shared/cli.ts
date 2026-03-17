/**
 * shared/cli.ts
 *
 * Shared CLI argument parser for every scraper in the suite.
 * Call parseScraperArgs() at the top of each scraper's index.ts and
 * destructure what you need.
 *
 * Defined once here so:
 *  - flag names are identical across scrapers
 *  - sentinel values are identical (null = flag not set)
 *  - a third scraper gets the full contract for free
 */

export interface ScraperCliArgs {
    IS_TEST: boolean
    IS_UPLOAD_TEST: boolean
    IS_RESUME: boolean
    /** null = flag absent; otherwise the N passed with --test N (default 5) */
    TEST_LIMIT: number | null
    /** null = flag absent; otherwise the N passed with --upload-test N (default 5) */
    UPLOAD_TEST_LIMIT: number | null
    /** Value of --category <slug|id|url-fragment>, or null if not provided */
    SINGLE_ID: string | null
}

export function parseScraperArgs(argv = process.argv.slice(2)): ScraperCliArgs {
    const IS_TEST = argv.includes('--test')
    const IS_UPLOAD_TEST = argv.includes('--upload-test')
    const IS_RESUME = argv.includes('--resume')

    const TEST_LIMIT = IS_TEST
        ? Math.max(1, parseInt(argv[argv.indexOf('--test') + 1] ?? '5', 10) || 5)
        : null

    const UPLOAD_TEST_LIMIT = IS_UPLOAD_TEST
        ? Math.max(1, parseInt(argv[argv.indexOf('--upload-test') + 1] ?? '5', 10) || 5)
        : null

    const SINGLE_ID = argv.includes('--category')
        ? (argv[argv.indexOf('--category') + 1] ?? null)
        : null

    return { IS_TEST, IS_UPLOAD_TEST, IS_RESUME, TEST_LIMIT, UPLOAD_TEST_LIMIT, SINGLE_ID }
}
