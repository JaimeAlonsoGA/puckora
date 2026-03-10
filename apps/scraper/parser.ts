/**
 * Amazon HTML parsers — re-exported from @puckora/scraper-core.
 *
 * The implementation lives in packages/scraper-core so it can be consumed by
 * other apps (extension content scripts, agent server) without duplication.
 * Import directly from '@puckora/scraper-core' in new code.
 */
export {
    isBlocked,
    isEmptyCategory,
    countBadges,
    parseProducts,
    parsePrice,
    parseRating,
    parseReviewCount,
} from '@puckora/scraper-core'
